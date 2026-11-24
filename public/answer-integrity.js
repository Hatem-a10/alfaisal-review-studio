'use strict';
/* Merge only locally changed answers when another tab saves the same attempt. */
const AnswerIntegrity=(()=>{
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const keyOK=k=>!['__proto__','constructor','prototype'].includes(k);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const validClock=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 const answers=v=>Object.fromEntries(Object.entries(object(v)?v:{}).filter(([k,x])=>keyOK(k)&&(typeof x==='string'||Number.isSafeInteger(x)&&x>=0)));
 const clocks=v=>Object.fromEntries(Object.entries(object(v)?v:{}).filter(([k,x])=>keyOK(k)&&Number.isSafeInteger(x)&&x>=0));
 const sameAttempt=(a,b)=>!!a&&!!b&&(typeof a.startedAt==='string'&&Number.isFinite(Date.parse(a.startedAt))||Number.isSafeInteger(a.startedAt)&&a.startedAt>0)&&a.startedAt===b.startedAt&&(!a.id||!b.id||a.id===b.id)&&(!a.setId||!b.setId||a.setId===b.setId);
 function reconcile(run,baseline,persisted,now=Date.now()){
  if(!run||!object(run.answers))return run;
  const current=answers(run.answers),prev=sameAttempt(baseline,run)?answers(baseline.answers):current;
  const same=sameAttempt(persisted,run);
  const localVersions=clocks(run.answerVersions),remoteVersions=same?clocks(persisted.answerVersions):{};
  const result=same?answers(persisted.answers):{...current},versions=same?{...remoteVersions}:{};
  for(const key of new Set([...Object.keys(prev),...Object.keys(current)])){
   const has=own(current,key),had=own(prev,key);
   if(has!==had||(has&&current[key]!==prev[key]))localVersions[key]=Math.min(Number.MAX_SAFE_INTEGER,Math.max(validClock(now),validClock(localVersions[key])+1,validClock(remoteVersions[key])+1));
  }
  for(const key of new Set([...Object.keys(current),...Object.keys(localVersions)])){
   const lv=validClock(localVersions[key]),rv=validClock(remoteVersions[key]);
   if(!same||lv>rv||lv===rv&&(!own(current,key)&&own(localVersions,key)||!own(remoteVersions,key)&&!own(result,key))){
    if(own(current,key))result[key]=current[key];else delete result[key];versions[key]=lv;
   }
  }
  return {...run,answers:result,answerVersions:versions};
 }
 return {reconcile};
})();
