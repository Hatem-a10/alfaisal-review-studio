'use strict';
(()=>{
 function collect(run){if(!run?.finishedAt||wrongBank.exams.includes('original:'+run.setId+':'+(run.startedAt||'')+':'+run.finishedAt))return;const exam=OriginalWrongEngine.adapt(run,id=>{const q=originalQuestionById(id),r=run.receipt?.questions.find(x=>x.id===id);return q&&r?{...q,question:r.question,options:r.options,letters:r.letters,answer:r.key}:q},id=>ORIGINAL_EXAMS.sources.find(s=>s.id===id),wrongBank.clearedAt);if(exam)saveMissedExam(exam)}
 function recover(){if(syncBusy||syncConflict||syncMeta.dirty||syncMeta.revision===null)return;for(const run of Object.values(originalRuns||{}))collect(run)}
 const save=saveOriginalRun;saveOriginalRun=function(){save();if(originalRun?.finishedAt)collect(originalRun)};
 const hydrate=hydrateStudyStores;hydrateStudyStores=function(){hydrate();setTimeout(recover,0)};
 // Timers can finish a saved exam while another view is open.
 setInterval(recover,3000);
 recover();
 const previousBank=wrongBankPanel;wrongBankPanel=function(){return previousBank().replace('included in private sync and full backups.','from mock and previous exams · included in private sync and full backups.')};
})();
