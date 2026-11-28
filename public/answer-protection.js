'use strict';
(()=>{
 let baseline=originalRun?structuredClone(originalRun):null;
 const save=saveOriginalRun;
 saveOriginalRun=function(){
  if(!originalRun)return save();
  let stored={};try{const parsed=JSON.parse(localStorage.getItem(originalRunsKey)||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid saved exam data');stored=parsed}catch{toast('Saved exams could not be read. No existing exam was overwritten.');return}
  const prior=stored[originalRun.setId];
  if(prior&&prior.startedAt===originalRun.startedAt&&prior.finishedAt){
   const sameAnswers=Object.keys(prior.answers||{}).length===Object.keys(originalRun.answers||{}).length&&Object.entries(prior.answers||{}).every(([key,value])=>Object.hasOwn(originalRun.answers||{},key)&&originalRun.answers[key]===value);
   if(prior.finishedAt!==originalRun.finishedAt||!sameAnswers){toast('This exam was completed in another tab. Open its saved results before continuing.');originalRun=structuredClone(prior);originalRuns={...originalRuns,...stored};baseline=structuredClone(prior);return}
   // Permit only an idempotent save or an optional receipt enrichment of the same frozen result.
   const receipt=originalRun.receipt;originalRun={...prior};
   if(!prior.receipt&&typeof StudioReliability!=='undefined'&&StudioReliability.validReceipt(receipt)&&receipt.id==='original:'+prior.setId+':'+prior.startedAt)originalRun.receipt=receipt;
  }
  if(prior&&prior.startedAt!==originalRun.startedAt&&Date.parse(prior.startedAt)>Date.parse(originalRun.startedAt)){toast('A newer attempt is open in another tab. Reopen the exam to avoid overwriting it.');return}
  originalRun=AnswerIntegrity.reconcile(originalRun,baseline,prior);originalRuns={...originalRuns,...stored,[originalRun.setId]:originalRun};
  save();baseline=structuredClone(originalRun);
 };
 const hydrate=hydrateStudyStores;
 hydrateStudyStores=function(){
  const activeOriginal=originalRun&&!originalRun.finishedAt?originalRun:null,activeSet=etSet&&!etSet.finished?etSet:null;
  hydrate();let restoreOriginal=false,restoreSet=false;
  if(activeOriginal&&(!originalRun||originalRun.setId!==activeOriginal.setId||originalRun.startedAt!==activeOriginal.startedAt||JSON.stringify(originalRun.answers)!==JSON.stringify(activeOriginal.answers))){
   const remote=originalRuns[activeOriginal.setId];
   if(!remote||!remote.finishedAt&&Date.parse(remote.startedAt)<=Date.parse(activeOriginal.startedAt)){originalRun=AnswerIntegrity.reconcile(activeOriginal,baseline,remote);originalRuns[originalRun.setId]=originalRun;restoreOriginal=true}
  }
  if(activeSet&&(!etSet||JSON.stringify(etSet)!==JSON.stringify(activeSet))){etSet=activeSet;restoreSet=true}
  if(restoreOriginal||restoreSet){const original=originalRun,set=etSet;setTimeout(()=>{if(restoreOriginal&&originalRun===original&&!original.finishedAt)saveOriginalRun();if(restoreSet&&etSet===set&&!set.finished)savePracticeDraft()},0);}
 };
 // Correct verified errors without presenting an unreliable key as certain.
 const fixes={'original-mol-exam-1-1':{answer:2,issue:'The original printed key is incorrect; mismatch repair is the supported answer.'},'original-mol-exam-1-25':{answer:3,issue:'The original printed key is incorrect; disrupted membrane integrity is the supported answer.'}};
 // Re-applied when a course pack loads (past-exam questions arrive with their course). Idempotent.
 const applyFixes=()=>{for(const [id,f] of Object.entries(fixes)){const q=originalQuestionById(id);if(q){q.answer=f.answer;q.sourceIssue=f.issue}}};applyFixes();window.addEventListener?.('review-course-loaded',applyFixes);
 // Reconcile older bank copies only after cloud sync has settled.
 function repairBank(){if(syncBusy||syncConflict||syncMeta.dirty||syncMeta.revision===null)return;let changed=false;for(const entry of wrongBank.entries){if(/^Printed key: /.test(entry.question.explanation||'')){entry.question.explanation=entry.question.explanation.replace(/^Printed key: /,'Original paper key (before shuffling): ');changed=true}const f=fixes[entry.question.id];if(!f)continue;if(Number.isInteger(f.answer)){const text=originalQuestionById(entry.question.id)?.options[f.answer],idx=entry.question.options.indexOf(text);if(idx>=0&&entry.question.answer!==idx){entry.question.answer=idx;changed=true}}else if(!entry.question.keyUncertain){entry.question.keyUncertain=true;changed=true}}if(changed){try{localStorage.setItem(wrongBankKey,JSON.stringify(wrongBank));if(view==='practice'&&etPracticeTab==='wrong')render()}catch{toast('Could not update the local answer-key review.')}}}
 setInterval(repairBank,3000);repairBank();
})();
