'use strict';
/* Shared by browser integration and build-time curriculum/changelog validation. */
function applyPulmonaryContent(learning,teaching,checks,diagrams,packs,quiz){
 const questionIds=new Set(learning.questions.map(q=>q.id)),sourceIds=new Set(learning.sources.map(s=>s.id));
 for(const pack of packs){
  for(const source of pack.sources){if(!sourceIds.has(source.id)){sourceIds.add(source.id);learning.sources.push(source)}}
  for(const[id,guide]of Object.entries(pack.guides)){
   teaching.guides[id]=guide;
   const lesson=learning.lessons.find(l=>l.id===id);if(!lesson)throw Error('Unknown pulmonary lecture '+id);
   lesson.scope='Expanded source-based teaching: '+(guide.title||id);lesson.references??=[];
   for(const ref of guide.sections.flatMap(s=>s.references||[]))if(!lesson.references.some(r=>r.source===ref.source))lesson.references.unshift(ref);
   for(const section of guide.sections){checks[section.id]=section.questions||[];for(const q of section.questions||[])if(!questionIds.has(q.id)){questionIds.add(q.id);learning.questions.push(q)}}
  }
  Object.assign(diagrams,pack.diagrams||{});
 }
 if(quiz&&!sourceIds.has(quiz.source.id))learning.sources.push(quiz.source);
 return {questionIds,sourceIds};
}
function applyPulmonaryQuiz(learning,teaching,checks,quiz){
 const targets=[['P18','compliance'],['P18','compliance'],['P16','deadspace'],['P16','deadspace'],['P17','conditions'],['P20','volume'],['P17','capacities'],['P17','helium'],['P18','compliance'],['P18','pressures'],['P19','surfactant'],['P16','epithelium'],['P20','volume'],['P21','forced'],['P19','cycle'],['P19','cycle'],['P21','patterns'],['P19','laplace']];
 for(const [i,original]of quiz.questions.entries()){
  const[code,slug]=targets[i],lecture='CVP-'+code,topic=lecture+':pulm-'+slug,section=teaching.guides[lecture]?.sections.find(s=>s.id===topic);if(!section)throw Error('Quiz topic not found '+topic);
  const q={id:original.id+'-reviewed',lectureIds:[lecture],concept:topic,question:original.question,options:[...original.options],answer:original.answer,reasons:[...original.reviewReasons],explanation:original.reviewReasons[original.answer],references:[{source:quiz.source.id,page:original.page}],kind:'Supplied quiz · reviewed practice',sourceType:'Supplied pulmonary quiz with individual reviewed explanations'};
  if(i===1)q.question='A patient inhales 2 L. Lung transmural pressure rises from +5 to +10 cm H₂O. What is lung compliance in L/cm H₂O?';
  if(i===16){q.question=q.question.replace(/\bminimum\b/,'maximum');q.repairNote='The original says minimum breath; a forced vital capacity maneuver begins after maximal inspiration.';original.sourceIssue='The stem says “minimum breath”; the intended FVC maneuver begins after a maximum inspiration. Original wording is retained here.'}
  if(i===11){original.sourceIssue='The printed key B (type II cell) is retained. The source explanation says these cells differentiate back to type II; type II cells can generate both type I and type II alveolar cells.'}
  if(i===17)original.sourceIssue='The listed0.3:1 is an approximation; the exact pressure ratio under the stated assumptions is1:3.';
  if(original.figures.length){q.image=original.figures[0].image;q.imageAlt='Original numbered lung pressure–volume curves · supplied quiz p1'}
  original.reviewedExplanation=original.reviewReasons.map((r,j)=>String.fromCharCode(65+j)+'. '+r).join('\n');
  if(!learning.questions.some(v=>v.id===q.id)){learning.questions.push(q);section.questions??=[];section.questions.push(q);checks[topic]=section.questions}
 }
}
