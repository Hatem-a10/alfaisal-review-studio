import type {Group,StudentProfile} from './student-profile';

export const riyadhDate = (date:Date) => new Intl.DateTimeFormat('en-CA',{
 timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'
}).format(date);

export function studentPlan(group:Group, profile:StudentProfile, baseline:string) {
 const breaks = new Set(group.events?.filter(event=>event.kind==='break'&&!event.time).map(event=>event.date));
 const cvpFinal=group.events?.find(event=>event.kind==='exam'&&/^CVP 112 Final Exam$/i.test(event.title))?.date;
 const pending = group.lectures.flatMap(lecture=>[0,1,2]
  .filter(pass=>!profile.reviews[lecture.id]?.includes(pass))
  .map(pass=>{
   const deadline=lecture.id.startsWith('CVP-')?cvpFinal:undefined;
   let original=lecture.reviewsOn?.[pass]||null;
   if (!original && lecture.availableOn) {
    const day=new Date(lecture.availableOn+'T12:00:00Z');
    day.setUTCDate(day.getUTCDate()+[0,2,5][pass]);
    original=day.toISOString().slice(0,10);
   }
   if (deadline&&original&&original>=deadline) original=null;
   return {id:lecture.id,title:lecture.title,pass,original,deadline};
  }));
 const booked = new Map<string,number>();
 for (const item of pending) if (item.original && item.original>=baseline)
  booked.set(item.original,(booked.get(item.original)||0)+1);
 const cutoff = new Date(baseline+'T12:00:00Z');
 cutoff.setUTCDate(cutoff.getUTCDate()+60);
 let day = new Date(baseline+'T12:00:00Z');
 const late = pending.filter(item=>item.original && item.original<baseline)
  .sort((a,b)=>a.original!.localeCompare(b.original!));
 const catchUp = new Map<string,string>();
 const lastCatchUp = new Map<string,string>();
 if (profile.plan==='gradual') {
  for (const item of late) {
   while (day<cutoff) {
    const date = day.toISOString().slice(0,10);
    const nextFixed = pending.find(next=>next.id===item.id && next.pass>item.pass && next.original && next.original>=baseline);
    if ((item.deadline&&date>=item.deadline)||(nextFixed?.original&&date>=nextFixed.original)) break;
    if (!breaks.has(date) && (booked.get(date)||0)<2 && lastCatchUp.get(item.id)!==date) {
     catchUp.set(item.id+':'+item.pass,date);
     booked.set(date,(booked.get(date)||0)+1);
     lastCatchUp.set(item.id,date);
     break;
    }
    day.setUTCDate(day.getUTCDate()+1);
   }
  }
 }
 return pending.map(item=>({...item,date:item.original && item.original>=baseline
  ?item.original:catchUp.get(item.id+':'+item.pass)||null}));
}
