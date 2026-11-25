'use strict';
(()=>{
 function stableApply(fn,args){const protect=['learning','practice','anki','anatomy','labs','ospe'].includes(view);if(protect)window.studySessionStable=true;try{return fn(...args)}finally{if(protect){window.studySessionRefreshPending=true;queueMicrotask(()=>window.studySessionStable=false)}}}
 const adopt=adoptCloud;adoptCloud=function(...args){return stableApply(adopt,args)};
 const resolve=window.resolveAutoConflict;window.resolveAutoConflict=function(...args){return stableApply(resolve,args)};
 const beforeRender=render;render=function(){if(window.studySessionStable){window.studySessionRefreshPending=true;return}return beforeRender()};
 const resume=restoreStudyPlace;restoreStudyPlace=function(){if(!window.skipRemoteResume)resume()};
 const beforeGo=go;go=function(v){if(window.studySessionRefreshPending&&v!==view){window.studySessionRefreshPending=false;window.skipRemoteResume=true;try{hydrateStudyStores();if(typeof refreshAnkiProgress==='function')refreshAnkiProgress()}finally{window.skipRemoteResume=false}}return beforeGo(v)};
 const beforeTheme=applyTheme;applyTheme=function(){beforeTheme();const c=StudioReliability.colors(settings.accent||'#5b4bd0',settings.theme==='amoled'),r=document.documentElement;r.style.setProperty('--green',c.text);r.style.setProperty('--accent-text',c.text);r.style.setProperty('--on-accent',c.onAccent)};applyTheme();
 function receiptRead(){const rows=StudyVault.read('options',{}).answerReceipts;return Array.isArray(rows)?rows.filter(StudioReliability.validReceipt):[]}
 function saveReceipt(r){
  if(!StudioReliability.validReceipt(r))return false;
  try{
   const list=receiptRead();if(list.some(x=>x.id===r.id))return true;
   if(JSON.stringify([r]).length>1800000)throw Error('Receipt exceeds archive capacity');
   const next=[...list,r].slice(-30);while(next.length>1&&JSON.stringify(next).length>1800000)next.shift();
   StudyVault.set('options',{...StudyVault.read('options',{}),answerReceipts:next});return true;
  }catch{toast('Answer receipt could not be archived. Your submission is handled separately.');return false}
 }
 function makeReceipt(...args){try{return StudioReliability.receipt(...args)}catch{toast('Answer receipt could not be created. Your submission is handled separately.');return null}}
 function originalReceipt(run){const r=run?.receipt;return run?.finishedAt&&r?.id==='original:'+run.setId+':'+run.startedAt&&StudioReliability.validReceipt(r)?r:null}
 function receiptForExport(id){return [etExam?.receipt,originalReceipt(originalRun),...receiptRead()].find(r=>r?.id===id&&StudioReliability.validReceipt(r))}
 const finish=etFinishExam;etFinishExam=function(reason){if(etExam&&!etExam.finishedAt){const r=makeReceipt(etExam.id,'mock',etExam.questions,etExam.answers);if(StudioReliability.validReceipt(r)){etExam.receipt=r;saveReceipt(r)}}return finish(reason)};
 const saveOriginal=saveOriginalRun;saveOriginalRun=function(){if(originalRun&&(!originalRun.finishedAt||originalRun.receipt?.id!=='original:'+originalRun.setId+':'+originalRun.startedAt))delete originalRun.receipt;saveOriginal();if(originalRun?.finishedAt&&!originalLowScore(originalRun)){const id='original:'+originalRun.setId+':'+originalRun.startedAt;if(originalRun.receipt?.id!==id){const receipt=makeReceipt(id,'original',originalRun.ids.map(originalQuestionById).filter(Boolean),originalRun.answers,originalRun.finishedAt);if(StudioReliability.validReceipt(receipt)){originalRun.receipt=receipt;saveReceipt(receipt);saveOriginal()}}}};
 const gradeOriginal=originalGrade;originalGrade=function(run){const r=originalReceipt(run);if(!r)return gradeOriginal(run);return {total:r.total,keyed:r.keyed,answered:r.questions.filter(q=>q.key!==null&&Number.isInteger(q.selected)).length,correct:r.correct,percent:r.questions.some(q=>q.key!==null&&Number.isInteger(q.selected))?Math.round(r.correct/r.questions.filter(q=>q.key!==null&&Number.isInteger(q.selected)).length*1000)/10:0,ungraded:r.total-r.keyed}};
 const questionOriginal=originalQuestionMarkup;originalQuestionMarkup=function(q,i,sourceLookup){const row=originalReceipt(originalRun)?.questions.find(r=>r.id===q.id);return questionOriginal(row?{...q,question:row.question,options:row.options,letters:row.letters,answer:row.key,receiptSelected:row.selected}:q,i,sourceLookup)};
 const record=etRecordSet;etRecordSet=function(qs,answers,label,options){if(label!=='Lesson topic questions')saveReceipt(makeReceipt(crypto.randomUUID(),'set',qs,answers));return record(qs,answers,label,options)};
 const results=etMockResults;etMockResults=function(){return results()+receiptButton(etExam?.receipt)};
 const originalWorkspaceBefore=originalWorkspace;originalWorkspace=function(){return originalWorkspaceBefore()+(visibleOriginalRun()?receiptButton(originalRun?.receipt):'')};
 function receiptButton(r){return StudioReliability.validReceipt(r)?'<div class="receipt-download"><button data-answer-receipt="'+esc(r.id)+'">'+icon('receipt')+' Export answer receipt</button><small>Submitted choices & frozen key · '+esc(r.keyVersion)+'</small></div>':''}
 function icon(type){return '<svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+(type==='receipt'?'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3"/>':'<path d="m5 12 4 4 10-10"/><circle cx="12" cy="12" r="10"/>')+'</svg>'}
 const dock=document.querySelector('.ui-mobile-nav');
 if(dock){const b=document.createElement('button');b.id='mobileSyncSettings';b.hidden=true;b.dataset.mobileExtra='true';b.innerHTML='<svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 10a8 8 0 0 1 14-4l2 3M20 14a8 8 0 0 1-14 4l-2-3M20 3v6h-6M4 21v-6h6"/></svg><span>Sync & settings</span>';dock.append(b);const dialog=document.createElement('dialog');dialog.className='mobile-sync-dialog';dialog.innerHTML='<div class="section-head"><h2>Sync & settings</h2><button aria-label="Close sync settings" id="closeMobileSync">✕</button></div><div id="mobileSyncBody"></div>';document.body.append(dialog);const widget=$('#syncWidget'),home=widget.parentNode;b.onclick=()=>{$('#mobileSyncBody').append(widget);widget.open=true;dialog.showModal()};$('#closeMobileSync').onclick=()=>dialog.close();dialog.addEventListener('close',()=>home.append(widget));}
 if(typeof installMobileDock==='function')installMobileDock();
 const section=document.createElement('section');section.className='panel reliability-panel';section.innerHTML='<h3>Reliability & recovery</h3><p class="muted">Test a backup in memory. Your current progress is never replaced.</p><div class="reliability-actions"><button id="verifyCurrentBackup">'+icon('check')+' Verify current backup</button><button id="verifyBackupFile">Check a backup file</button><input type="file" accept=".json,application/json" id="backupCheckFile" hidden></div><p id="backupCheckResult" role="status"></p><details><summary>Answer receipts · up to 30 recent qualifying submissions</summary><div id="receiptList"></div></details><details><summary>Startup performance · this device</summary><p id="startupPerformance"></p><p class="muted">Target: 1 second to the ready interface. Network, sign-in and device speed affect actual results. Recorded locally; no analytics service.</p></details>';
 $('#adminSettingsContent').append(section);
 function receipts(){const list=receiptRead();$('#receiptList').innerHTML=list.slice().reverse().map(r=>'<p><button data-answer-receipt="'+esc(r.id)+'">'+esc(r.kind)+' · '+esc(stamp(r.at))+' · '+r.correct+'/'+r.keyed+'</button></p>').join('')||'<p>New qualifying submissions will appear here. Older attempts have no historical receipt.</p>'}
 function check(raw){try{const r=StudioReliability.verifyBackup(raw,validateBackup,StudyVault.valid,mergeRecords,StudyVault.merge);$('#backupCheckResult').textContent='Verified in memory · '+r.lectures+' lecture records · '+r.stores+' companion stores · completion timestamps preserved. Media and Anki deck files require their separate backups.'}catch(e){$('#backupCheckResult').textContent='Verification failed: '+e.message}}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='verifyCurrentBackup')check(structuredClone(bundle()));if(b.id==='verifyBackupFile')$('#backupCheckFile').click();if(b.id==='openSiteAdmin'){receipts();paintPerformance()}if(b.dataset.answerReceipt){const r=receiptForExport(b.dataset.answerReceipt);if(r)downloadJSON(r,'answer-receipt-'+r.at.slice(0,10)+'.json');else toast('This answer receipt is unavailable.')}});
 $('#backupCheckFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>12000000)throw Error('Backup exceeds 12 MB');check(JSON.parse(await f.text()))}catch(err){$('#backupCheckResult').textContent='Verification failed: '+err.message}finally{e.target.value=''}};
 function performanceSamples(){
  try{const samples=JSON.parse(localStorage.getItem('studio-startup-metrics')||'[]');return Array.isArray(samples)?samples.filter(s=>Number.isFinite(s?.ready)&&s.ready>=0):null}catch{return null}
 }
 function paintPerformance(){const samples=performanceSamples()||[],latest=samples.at(-1),sorted=samples.map(s=>s.ready).sort((a,b)=>a-b),middle=Math.floor(sorted.length/2),median=sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;$('#startupPerformance').textContent=latest?'Latest: '+(latest.ready/1000).toFixed(2)+' s · median: '+(median/1000).toFixed(2)+' s · '+samples.length+' recent launches. '+(latest.ready<=1000?'Within target.':'Above target on this launch.'):'Available after the next completed startup.'}
 window.addEventListener('studio-ready',()=>{try{const ready=performance.getEntriesByName('studio-ready').at(-1)?.startTime;if(!Number.isFinite(ready))return;const list=performanceSamples();if(!list)return;localStorage.setItem('studio-startup-metrics',JSON.stringify([...list,{at:new Date().toISOString(),ready:Math.round(ready),width:innerWidth}].slice(-20)))}catch{}});
})();

/* Sync details live in Site settings. The sidebar keeps a one-line status that opens
   Settings; the full panel (device/cloud state, sync issues, sync now, recovery tools)
   is moved, not copied, so every existing handler and status update keeps working. */
(()=>{
 const widget=document.getElementById('syncWidget'),body=widget?.querySelector('.sync-widget-body'),frame=document.querySelector('#siteAdmin .admin-frame'),open=document.getElementById('openSiteAdmin');
 if(!widget||!body||!frame||!open)return;
 const panel=document.createElement('section');panel.className='panel settings-sync';panel.innerHTML='<h3>Sync & backup</h3>';
 panel.append(body);
 const tools=document.createElement('details');tools.className='settings-sync-tools';tools.innerHTML='<summary>Recovery tools</summary>';
 // The damaged-data export is created later in startup, so collect it whenever Settings opens.
 const collect=()=>{const damaged=document.getElementById('exportDamagedStudy');if(damaged&&damaged.parentElement!==tools){tools.append(damaged);panel.append(tools)}const repair=document.querySelector('#siteAdmin [data-sync-repair]');if(repair&&repair.parentElement!==tools){repair.classList.remove('panel');repair.querySelector('h3')?.remove();tools.append(repair);panel.append(tools)}};
 collect();open.addEventListener('click',collect);window.addEventListener('studio-ready',collect);
 frame.querySelector('.section-head')?.after(panel);
 open.hidden=true;open.style.display='none';widget.open=false;widget.classList.add('sync-status-only');
 const summary=widget.querySelector('summary');
 summary?.setAttribute('aria-label','Cloud sync status. Open sync settings');
 summary?.addEventListener('click',e=>{e.preventDefault();open.click()});
 widget.addEventListener('toggle',()=>{if(widget.open)widget.open=false});
 const mobile=document.getElementById('mobileSyncSettings');if(mobile)mobile.onclick=()=>open.click();
 // Keep Close reachable while scrolling: it sits on the dialog, outside the scrolling frame.
 const close=document.getElementById('closeSiteAdmin'),dialog=document.getElementById('siteAdmin');
 if(close&&dialog){close.classList.add('site-settings-close');dialog.prepend(close);}
})();
