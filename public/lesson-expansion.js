'use strict';
function applyLessonExpansion(learning,teaching,checks,pack){
 const questionIds=new Set(learning.questions.map(q=>q.id));
 for(const [id,entry] of Object.entries(pack)){
  const guide=teaching.guides[id];
  if(entry.guide)Object.assign(guide,entry.guide);
  for(const [sectionId,expansion] of Object.entries(entry.sections)){
   const section=guide?.sections.find(s=>s.id===sectionId);
   if(!section)throw Error('Missing expansion target '+sectionId);
   const references=expansion.references.split(';').flatMap(group=>{
    const [source,pages]=group.split(':');
    return pages.split(',').map(page=>({source,page:Number(page)}));
   });
   Object.assign(section,expansion,{references});
  }
  for(const q of entry.questions||[]){
   if(!questionIds.has(q.id)){
    learning.questions.push(q);
    questionIds.add(q.id);
   }
   const group=checks[q.concept]??=[];
   if(!group.some(existing=>existing.id===q.id))group.push(q);
  }
  for(const [key,activity] of [['fillBlanks',entry.blank],['matching',entry.matching]]){
   if(!activity)continue;
   const list=guide[key]??=[];
   if(!list.some(existing=>existing.id===activity.id))list.push(activity);
  }
 }
}
