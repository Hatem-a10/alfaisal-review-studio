/* Official timetable selection is independent of study records and review dates. */
const GroupSchedules=(()=>{
 const array=v=>Array.isArray(v)?v:[];
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
  const days=settings?.englishFrequency===3?[0,2,4]:[1,3],time=settings?.englishStartTime==='17:00'?1020:1050;
  return days.map(offset=>{const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);const date=d.toISOString().slice(0,10);return {id:'personal-english-'+date,date,title:'English',start:time,end:time+60,kind:'english',custom:true,source:'Personal English preference',detail:settings?.englishFrequency===3?'Sunday, Tuesday & Thursday':'Monday & Wednesday'}});
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
 // Shared only for one synchronous render turn. Never cache across student changes,
 // timetable reloads, or asynchronous route transitions.
 const weekMemo=[];let weekReset=false;
 function rememberWeek(catalog,legacy,eventRows,start,settings,p,shared){
  if(weekMemo.length>=24)return;
  const key=JSON.stringify([start,shared,p.group,p.section,p.lab,settings?.englishFrequency,settings?.englishStartTime,settings?.englishEnabled]);
  weekMemo.push({catalog,events:catalog?.events,legacy,key,rows:eventRows.map(e=>e.custom?{...e}:e)});
  if(!weekReset){weekReset=true;(typeof queueMicrotask==='function'?queueMicrotask:fn=>Promise.resolve().then(fn))(()=>{weekMemo.length=0;weekReset=false})}
 }
 function selected(start,settings,catalog,legacy,shared=false){
  if(!validDay(start))return [];
  const p=profile(settings),key=JSON.stringify([start,shared,p.group,p.section,p.lab,settings?.englishFrequency,settings?.englishStartTime,settings?.englishEnabled]);
  const hit=weekMemo.find(entry=>entry.catalog===catalog&&entry.events===catalog?.events&&entry.legacy===legacy&&entry.key===key);
  if(hit)return hit.rows.map(e=>e.custom?{...e}:e);
  const end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+4);const last=end.toISOString().slice(0,10);
  const old=p.group==='M1'&&p.section==='A'?array(legacy).filter(e=>timed(e)&&(!e.shared||shared)&&(p.lab==='1.6'||!['lab','shared'].includes(e.kind))):[];
  const official=array(catalog?.events).filter(e=>timed(e)&&assignedProfile(e,p)&&(!e.shared||shared));
  const byId=new Map(),withoutId=[];for(const e of old.concat(official)){if(typeof e.id==='string'&&e.id)byId.set(e.id,e);else withoutId.push(e)}
  const resolved=authoritative([...byId.values(),...withoutId]);
  const rows=resolved.filter(e=>e.date>=start&&e.date<=last).concat(english(start,settings)).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
  rememberWeek(catalog,legacy,rows,start,settings,p,shared);return rows;
 }
 return {profile,assigned,english,selected,authoritative};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=GroupSchedules;
