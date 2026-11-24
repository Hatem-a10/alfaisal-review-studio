'use strict';
const LabCore=(()=>{
 const array=v=>Array.isArray(v)?v:[];
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const validId=v=>typeof v==='string'&&v.length>0&&!['__proto__','constructor','prototype'].includes(v);
 const stamp=x=>typeof x?.at==='string'&&Number.isFinite(Date.parse(x.at))?Date.parse(x.at):-Infinity;
 function newest(a,b){return !a?b:!b?a:stamp(b)>stamp(a)?b:a}
 function mapMerge(a={},b={}){const m={};for(const source of [object(a),object(b)])for(const[k,v]of Object.entries(source)){if(!validId(k)||!v||typeof v!=='object'||Array.isArray(v))continue;m[k]=newest(m[k],v)}return m}
 function merge(a={},b={}){a=object(a);b=object(b);const attempts=new Map();for(const x of [...array(a.attempts),...array(b.attempts)])if(validId(x?.id))attempts.set(x.id,newest(attempts.get(x.id),x));return {lastView:newest(a.lastView,b.lastView),attempts:[...attempts.values()].sort((x,y)=>stamp(x)-stamp(y)).slice(-500),mastery:mapMerge(a.mastery,b.mastery),drafts:mapMerge(a.drafts,b.drafts),navigation:mapMerge(a.navigation,b.navigation),notes:mapMerge(a.notes,b.notes)}}
 const validChoice=(q,value)=>Array.isArray(q?.options)&&Number.isSafeInteger(value)&&value>=0&&value<q.options.length;
 function score(questions,answers){const qs=array(questions),values=object(answers),correct=qs.filter(q=>validChoice(q,q?.answer)&&validChoice(q,values[q.id])&&values[q.id]===q.answer).length,total=qs.length;return {correct,total,percent:total?correct*100/total:0,complete:total>0&&qs.every(q=>validId(q?.id)&&validChoice(q,q.answer)&&validChoice(q,values[q.id]))}}
 function visualPassed(questions, answers) {
  const visual = array(questions).filter(question => question?.visual || question?.figure);
  return !visual.length || visual.some(question => validChoice(question,question.answer)&&validChoice(question,answers?.[question.id])&&answers[question.id]===question.answer);
 }
 function mastered(data,topic) {
  const qs=array(topic?.questions);if(!validId(topic?.id)||!qs.length)return false;
  const earned = data?.mastery?.[topic.id];
  const hasVisual = qs.some(question => question?.visual || question?.figure);
  if (earned && Number.isFinite(stamp(earned)) && (!hasVisual || earned.visual===true)) return true;
  return array(data?.attempts).some(attempt => {
   if(!attempt||attempt.topic!==topic.id||attempt.kind!=='mcq'||attempt.total!==qs.length||!Number.isSafeInteger(attempt.correct)||attempt.correct<0||attempt.correct>attempt.total||attempt.correct/attempt.total<.85)return false;
   if(attempt.answers!==undefined){const checked=score(qs,attempt.answers);if(!checked.complete||checked.correct!==attempt.correct)return false}
   return visualPassed(qs,attempt.answers);
  });
 }
 function resume(module,data){const topics=array(module?.topics);const first=topics.findIndex(t=>!mastered(data,t));if(first>=0)return first;const last=data?.navigation?.[module?.id]?.topic;const i=topics.findIndex(t=>t?.id===last);return i<0?0:i}
 function restoreDraft(topic,draft,fresh){
  if(!draft||!validId(draft.id)||draft.topic!==topic.id||typeof draft.submitted!=='boolean')return fresh;
  const answers={};for(const q of array(topic.questions))if(validId(q?.id)&&validChoice(q,draft.answers?.[q.id]))answers[q.id]=draft.answers[q.id];
  if(draft.submitted&&!score(topic.questions,answers).complete)return {...fresh,answers};
  return {...draft,answers};
 }
 function normalize(v){return String(v).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ').replace(/[μµ]/g,'u')}
 function order(q,seed){let n=2166136261;for(const c of q.id+seed)n=Math.imul(n^c.charCodeAt(0),16777619);const out=q.options.map((_,i)=>i);for(let i=out.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;let j=n%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
 return {merge,score,visualPassed,mastered,resume,restoreDraft,normalize,order};
})();
