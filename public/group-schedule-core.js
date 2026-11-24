/* Official timetable selection is independent of study records and review dates. */
const GroupSchedules=(()=>{
 const array=v=>Array.isArray(v)?v:[];
 // A5-122: catalog events are immutable between timetable catalog loads. Rebuild on
 // new array identity, length, or endpoint replacement; keys contain group only.
 const groupRows=new WeakMap();
 function catalogGroup(rows,group){
  if(!group||!rows.length)return [];
  let indexed=groupRows.get(rows);
  if(!indexed||indexed.size!==rows.length||indexed.first!==rows[0]||indexed.last!==rows[rows.length-1]){
   const byGroup=new Map();
   for(const row of rows)if(row&&Array.isArray(row.studentGroups))for(const g of new Set(row.studentGroups)){
    if(!byGroup.has(g))byGroup.set(g,[]);
    byGroup.get(g).push(row);
   }
   indexed={size:rows.length,first:rows[0],last:rows[rows.length-1],byGroup};
   groupRows.set(rows,indexed);
  }
  return indexed.byGroup.get(group)||[];
 }
 // A5-124: English recurrence dates depend only on official week start and
 // 2/3-day preference; never cache account-specific event objects or time.
 const recurringDays=new Map();
 function englishDates(start,three){
  const key=start+'|'+three,stored=recurringDays.get(key);if(stored)return stored;
  const dates=(three?[0,2,4]:[1,3]).map(offset=>{const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)});
  if(recurringDays.size>=24)recurringDays.delete(recurringDays.keys().next().value);
  recurringDays.set(key,dates);return dates;
 }

 const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 const validGroup=g=>['M1','M2','F1','F2'].includes(g);
 const validSection=s=>['A','B'].includes(s);
 const timed=e=>e&&validDay(e.date)&&Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=0&&e.start<e.end&&e.end<=1440;
 function profile(settings={}){
  settings=settings||{};const legacy=settings.legacyProfile===true&&!settings.groupConfigured;
  return {group:validGroup(settings.studentGroup)?settings.studentGroup:legacy?'M1':'',section:validSection(settings.studentSection)?settings.studentSection:legacy?'A':'',lab:typeof settings.labGroup==='string'&&settings.labGroup?settings.labGroup:legacy&&!settings.labGroupConfigured?'1.6':''};
 }
 function assignedProfile(event,p){
  return !!event&&!!p.group&&Array.isArray(event.studentGroups)&&event.studentGroups.includes(p.group)&&(!event.studentSection||event.studentSection===p.section)&&(event.labGroups===undefined||Array.isArray(event.labGroups)&&(!event.labGroups.length||event.labGroups.includes(p.lab)));
 }
 function assigned(event,settings){return assignedProfile(event,profile(settings))}
 function english(start,settings={}){
  if(!validDay(start)||settings?.englishEnabled===false)return [];
  const three=settings?.englishFrequency===3,time=settings?.englishStartTime==='17:00'?1020:1050;
  return englishDates(start,three).map(date=>({id:'personal-english-'+date,date,title:'English',start:time,end:time+60,kind:'english',custom:true,source:'Personal English preference',detail:three?'Sunday, Tuesday & Thursday':'Monday & Wednesday'}));
 }
 function authority(event){return event?.course==='REN'&&typeof event.source==='string'&&/^(?:Renal Schedule\.pdf|REN123_Fall 26-27 Weekly Time Table(?:[^/]*\.xlsx)?)$/i.test(event.source)}
 function assessmentKey(event){const text=typeof event?.title==='string'?event.title:'',course=text.match(/\b(CVP|MOL|REN|COM)\s*(?:112|114|123|116)?\b/i)?.[1]?.toUpperCase()||(event?.kind==='assessment'&&['CVP','MOL','REN','COM'].includes(event?.course)?event.course:null),kind=/OSPE|practical/i.test(text)?'practical':/final/i.test(text)?'final':/mid.?term/i.test(text)?'midterm':null;return course&&kind?course+':'+kind:null}
 function authoritative(rows,source=rows){
  const byDate=new Map(),assessments=new Set();
  for(const e of array(source))if(authority(e)&&!e.shared){
   if(timed(e)){const list=byDate.get(e.date)||[];list.push(e);byDate.set(e.date,list)}
   const key=assessmentKey(e);if(key&&validDay(e.date))assessments.add(key);
  }
  return array(rows).filter(e=>e&&(authority(e)||!assessments.has(assessmentKey(e))&&(!timed(e)||!(byDate.get(e.date)||[]).some(r=>r.start<e.end&&e.start<r.end))));
 }
 function selected(start,settings,catalog,legacy,shared=false){
  if(!validDay(start))return [];
  const end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+4);const last=end.toISOString().slice(0,10),p=profile(settings);
  const old=p.group==='M1'&&p.section==='A'?array(legacy).filter(e=>timed(e)&&(!e.shared||shared)&&(p.lab==='1.6'||!['lab','shared'].includes(e.kind))):[];
  const official=catalogGroup(array(catalog?.events),p.group).filter(e=>timed(e)&&assignedProfile(e,p)&&(!e.shared||shared));
  const byId=new Map(),withoutId=[];for(const e of old.concat(official)){if(typeof e.id==='string'&&e.id)byId.set(e.id,e);else withoutId.push(e)}
  const resolved=authoritative([...byId.values(),...withoutId]);
  return resolved.filter(e=>e.date>=start&&e.date<=last).concat(english(start,settings)).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
 }
 return {profile,assigned,english,selected,authoritative};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=GroupSchedules;
