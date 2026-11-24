'use strict';
/* Merge only locally changed answers when another tab saves the same attempt. */
const AnswerIntegrity=(()=>{
 const sameAttempt=(a,b)=>!!a&&!!b&&a.startedAt===b.startedAt&&(!a.id||!b.id||a.id===b.id)&&(!a.setId||!b.setId||a.setId===b.setId);
 function reconcile(run,baseline,persisted,now=Date.now()){
  if(!run||!run.answers)return run;
  const prev=sameAttempt(baseline,run)?baseline.answers||{}:run.answers;
  const same=sameAttempt(persisted,run);
  const localVersions={...(run.answerVersions||{})},remoteVersions=same?(persisted.answerVersions||{}):{};
  const result=same?{...persisted.answers}:{...run.answers},versions=same?{...remoteVersions}:{};
  for(const key of new Set([...Object.keys(prev),...Object.keys(run.answers)])){
   const has=Object.prototype.hasOwnProperty.call(run.answers,key),had=Object.prototype.hasOwnProperty.call(prev,key);
   if(has!==had||(has&&run.answers[key]!==prev[key]))localVersions[key]=Math.max(now,Number(remoteVersions[key]||0)+1);
  }
  for(const key of new Set([...Object.keys(run.answers),...Object.keys(localVersions)])){
   const lv=Number(localVersions[key]||0),rv=Number(remoteVersions[key]||0);
   if(!same||lv>rv||lv===rv&&!Object.hasOwn(remoteVersions,key)&&!Object.hasOwn(result,key)){
    if(Object.prototype.hasOwnProperty.call(run.answers,key))result[key]=run.answers[key];else delete result[key];versions[key]=lv;
   }
  }
  return {...run,answers:result,answerVersions:versions};
 }
 return {reconcile};
})();
