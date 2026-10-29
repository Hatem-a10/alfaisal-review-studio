'use strict';
/* Adapt original printed-key exams to the shared wrong-answer bank. */
const OriginalWrongEngine=(()=>{
 function adapt(run,lookup,source,clearedAt){
  if(!run?.finishedAt||run.excludedLowScore||!Array.isArray(run.ids)||!run.answers||!Number.isFinite(Date.parse(run.finishedAt))||Date.parse(run.finishedAt)<=(Date.parse(clearedAt)||0))return null;
  const raw=run.ids.map(lookup).filter(Boolean),keyed=raw.filter(q=>q.type==='mcq'&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options?.length);
  if(!keyed.length||keyed.filter(q=>run.answers[q.id]===q.answer).length*100<keyed.length*15)return null;
  const questions=[],answers={};
  for(const q of keyed){
   if(q.options.length<2||q.options.length>8||q.options.some(o=>typeof o!=='string'||!o.trim()))continue;
   const src=source(q.source),course=(q.lectureId?.startsWith('CVP-')||/^cvp/i.test(q.source||''))?'CVP':'MOL',explanation=q.sourceExplanation||q.reviewedExplanation||'The supplied paper provides a printed answer key but no explanation for this question.';
   const adapted={id:q.id,lectureIds:[q.lectureId||course+'-original-exam'],question:q.question,options:[...q.options],answer:q.answer,explanation:'Printed key: '+(q.printedAnswer||q.letters?.[q.answer]||String.fromCharCode(65+q.answer))+'. '+explanation,reasons:q.options.map(()=> 'The source does not supply a separate explanation for this option.'),kind:'Original previous exam · printed key',references:[],sourceUrl:src?.url?src.url+'#page='+(q.page||1):'',sourceTitle:src?.title||'Original exam',...(q.figures?.[0]?.image?{image:q.figures[0].image,imageAlt:'Original exam question figure'}:{})};
   const i=questions.length;questions.push(adapted);if(Number.isInteger(run.answers[q.id])&&run.answers[q.id]>=0&&run.answers[q.id]<q.options.length)answers[i]=run.answers[q.id];
  }
  return {id:'original:'+run.setId+':'+(run.startedAt||'')+':'+run.finishedAt,finishedAt:run.finishedAt,questions,answers};
 }
 return {adapt};
})();
