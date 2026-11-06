'use strict';
const LabCore=(()=>{
 const stamp=x=>Date.parse(x?.at)||0;
 function newest(a,b){return stamp(b)>stamp(a)?b:a}
 function mapMerge(a={},b={}){const m={...a};for(const[k,v]of Object.entries(b)){if(['__proto__','constructor','prototype'].includes(k))continue;m[k]=m[k]?newest(m[k],v):v;}return m}
 function merge(a={},b={}){const attempts=new Map();for(const x of [...(a.attempts||[]),...(b.attempts||[])])if(x?.id)attempts.set(x.id,attempts.has(x.id)?newest(attempts.get(x.id),x):x);return {lastView:newest(a.lastView,b.lastView),attempts:[...attempts.values()].sort((x,y)=>stamp(x)-stamp(y)).slice(-500),mastery:mapMerge(a.mastery,b.mastery),drafts:mapMerge(a.drafts,b.drafts),navigation:mapMerge(a.navigation,b.navigation),notes:mapMerge(a.notes,b.notes)}}
 function score(questions,answers){const correct=questions.filter(q=>answers[q.id]===q.answer).length,total=questions.length;return {correct,total,percent:total?correct*100/total:0,complete:questions.every(q=>Number.isInteger(answers[q.id])&&answers[q.id]>=0&&answers[q.id]<q.options.length)}}
 function visualPassed(questions, answers) {
  const visual = questions.filter(question => question.visual || question.figure);
  return !visual.length || visual.some(question => answers?.[question.id] === question.answer);
 }
 function mastered(data,topic) {
  const earned = data.mastery?.[topic.id];
  const hasVisual = topic.questions.some(question => question.visual || question.figure);
  if (earned && (!hasVisual || earned.visual)) return true;
  return (data.attempts || []).some(attempt => attempt.topic === topic.id && attempt.kind === 'mcq'
   && attempt.total === topic.questions.length && attempt.correct / attempt.total >= .85
   && visualPassed(topic.questions, attempt.answers));
 }
 function resume(module,data){const first=module.topics.findIndex(t=>!mastered(data,t));if(first>=0)return first;const last=data.navigation?.[module.id]?.topic;const i=module.topics.findIndex(t=>t.id===last);return i<0?0:i}
 function normalize(v){return String(v).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ').replace(/[μµ]/g,'u')}
 function order(q,seed){let n=2166136261;for(const c of q.id+seed)n=Math.imul(n^c.charCodeAt(0),16777619);const out=q.options.map((_,i)=>i);for(let i=out.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;let j=n%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
 return {merge,score,visualPassed,mastered,resume,normalize,order};
})();
