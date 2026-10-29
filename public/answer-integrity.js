'use strict';
/* Merge only locally changed answers when another tab saves the same attempt. */
const AnswerIntegrity=(()=>{
 function reconcile(run,baseline,persisted,now=Date.now()){
  if(!run||!run.answers)return run;
  const prev=baseline&&baseline.startedAt===run.startedAt?baseline.answers||{}:run.answers;
  const same=persisted&&persisted.startedAt===run.startedAt;
  const localVersions={...(run.answerVersions||{})},remoteVersions=same?(persisted.answerVersions||{}):{};
  const result=same?{...persisted.answers}:{...run.answers},versions=same?{...remoteVersions}:{};
  for(const key of new Set([...Object.keys(prev),...Object.keys(run.answers)])){
   const has=Object.prototype.hasOwnProperty.call(run.answers,key),had=Object.prototype.hasOwnProperty.call(prev,key);
   if(has!==had||(has&&run.answers[key]!==prev[key]))localVersions[key]=Math.max(now,Number(remoteVersions[key]||0)+1);
  }
  for(const key of new Set([...Object.keys(run.answers),...Object.keys(localVersions)])){
   const lv=Number(localVersions[key]||0),rv=Number(remoteVersions[key]||0);
   if(!same||lv>rv||lv===rv&&!Object.prototype.hasOwnProperty.call(result,key)){
    if(Object.prototype.hasOwnProperty.call(run.answers,key))result[key]=run.answers[key];else delete result[key];versions[key]=lv;
   }
  }
  return {...run,answers:result,answerVersions:versions};
 }
 return {reconcile};
})();
