'use strict';
(()=>{
 const widget=document.querySelector('#syncWidget .sync-widget-body');if(!widget)return;
 const open=document.createElement('button');open.type='button';open.id='openSiteAdmin';open.textContent='Site settings';widget.appendChild(open);
 const dialog=document.createElement('dialog');dialog.id='siteAdmin';dialog.innerHTML='<div class="admin-frame"><div class="section-head"><div><h2>Site settings</h2></div><button id="closeSiteAdmin" type="button" aria-label="Close site settings">✕</button></div><div class="admin-recovery"><h3>Recovery</h3><p class="muted">Download the recovery copy saved before a restore or merge.</p></div><div id="adminBody" aria-live="polite">Loading site information…</div></div>';document.body.appendChild(dialog);const closeButton=dialog.querySelector('#closeSiteAdmin');closeButton.autofocus=true;const focusClose=()=>{try{closeButton.focus({preventScroll:true})}catch{closeButton.focus()}};const recovery=document.getElementById('exportRecoveryCopy');if(recovery)dialog.querySelector('.admin-recovery').appendChild(recovery);
 // Relocate the existing backup controls without replacing their event handlers.
 const backup=document.createElement('section');backup.className='panel admin-backup';backup.innerHTML='<h3>Import & export</h3><p class="muted">Save a backup or restore your study progress.</p>';
 const actions=widget.querySelector('.backup-actions');if(actions)backup.append(actions);
 const file=document.getElementById('file');if(file)backup.append(file);
 dialog.querySelector('.admin-recovery').before(backup);
 const quick=document.createElement('div');quick.className='sync-quick-actions';
 const sync=document.getElementById('syncNow');
 if(sync)sync.dataset.quickAction='sync';open.dataset.quickAction='settings';
 for(const [button,label,path] of [[sync,'Sync now','M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 11-2l3 3 M4 16l3 3a7 7 0 0 0 11-2'],[open,'Site settings','M9.5 3h5l.5 3 2 .9 2.6-1.1 2.5 4.4-2.1 2 .1 2.1 2 2-2.5 4.3-2.7-1.1-1.9 1-.5 2.5h-5L9 20.4l-2-1-2.6 1.1L2 16.2l2-2v-2.3l-2-2 2.5-4.3 2.7 1.1L9 5.8z M15.5 12a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0']]){
  if(!button)continue;button.type='button';button.setAttribute('aria-label',label);button.title=label;button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';quick.append(button);
 }
 widget.append(quick);
 // Keep the status node for existing sync updates, but avoid repeating this steady-state row.
 const saveLabel=document.getElementById('saveLabel');if(saveLabel)saveLabel.hidden=true;
 const admin=document.createElement('section');admin.className='admin-tools';admin.innerHTML='<button type="button" id="toggleAdminSettings" aria-expanded="false" aria-controls="adminSettingsContent">Admin settings <span aria-hidden="true">⌄</span></button><form id="adminUnlockForm" hidden><label>Admin phrase<input id="adminPhrase" type="password" autocomplete="off" required></label><button type="submit">Unlock</button><p id="adminUnlockStatus" role="status"></p></form><div id="adminSettingsContent" hidden></div>';
 dialog.querySelector('.admin-frame').append(admin);
 const managed=window.REVIEW_STUDIO_FRESH_ACCOUNTS===true;
 if(managed){admin.hidden=true;admin.style.display='none'}
 const adminContent=admin.querySelector('#adminSettingsContent'),unlockForm=admin.querySelector('form'),adminToggle=admin.querySelector('#toggleAdminSettings');
 for(const el of [backup,dialog.querySelector('.admin-recovery'),dialog.querySelector('#adminBody')])adminContent.append(el);
 if(managed){
  dialog.querySelector('.admin-frame').append(backup,dialog.querySelector('.admin-recovery'));
 }
 let managedRole='student';
 const changeLogLabel=document.createElement('label');changeLogLabel.className='admin-changelog-toggle';const changeLogToggle=document.createElement('input');changeLogToggle.type='checkbox';changeLogToggle.id='adminLectureChanges';changeLogLabel.append(changeLogToggle,document.createTextNode('Lecture change log'));adminContent.prepend(changeLogLabel);changeLogToggle.onchange=()=>{if(!unlocked)return;saveOptions({...storeOptions(),adminLectureChanges:changeLogToggle.checked});window.dispatchEvent(new CustomEvent('lecture-changelog-preference'))};
 let unlocked=false;
 function announce(){changeLogToggle.checked=storeOptions().adminLectureChanges!==false;window.reviewAdmin=unlocked;window.dispatchEvent(new CustomEvent('review-admin-role',{detail:{admin:unlocked}}))}
 function expandAdmin(){const opened=adminToggle.getAttribute('aria-expanded')==='true';adminToggle.setAttribute('aria-expanded',String(!opened));adminContent.hidden=opened;unlockForm.hidden=true;if(!opened)read()}
 async function refreshAdminAuthorization(){
  try {
   const r=await fetch(managed?'/api/control-center/access':'/api/capabilities',{cache:'no-store',credentials:'same-origin'});
   if(!r.ok){
    if(managed){admin.hidden=true;admin.style.display='none';managedRole='student';unlocked=false;unlockForm.hidden=true;if(r.status===401||r.status===403)window.reviewAdmin=false}
    return;
   }
   const value=await r.json();
   if(managed){
    managedRole=value.role;admin.hidden=false;admin.style.removeProperty('display');unlocked=managedRole==='owner'&&value.unlocked===true;
    adminContent.hidden=true;
   } else {
    unlocked=value.admin===true;
    if(!unlocked){adminContent.hidden=true;adminToggle.setAttribute('aria-expanded','false')}
   }
   announce();
  } catch {
   if(managed){admin.hidden=true;admin.style.display='none';managedRole='student';unlocked=false}
  }
 }
 window.refreshAdminAuthorization=refreshAdminAuthorization;
 async function openControlCenter(){
  try {const {openAdminCenter}=await import('/admin-control-center.mjs');await openAdminCenter();}
  catch {const status=admin.querySelector('#adminUnlockStatus');unlockForm.hidden=false;status.textContent='The Control Center could not open. Reconnect and try again.';}
 }
 adminToggle.onclick=()=>{
  if(managed && (unlocked||['editor','moderator'].includes(managedRole))) {openControlCenter();return;}
  if(unlocked)expandAdmin();
  else{unlockForm.hidden=!unlockForm.hidden;if(!unlockForm.hidden)admin.querySelector('input').focus()}
 };
 unlockForm.onsubmit=async e=>{e.preventDefault();const input=admin.querySelector('input'),password=input.value,submit=unlockForm.querySelector('button'),status=admin.querySelector('#adminUnlockStatus');input.value='';submit.disabled=true;status.textContent='Verifying…';try{const response=await fetch('/api/admin-auth',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}),value=await response.json();if(!response.ok||value.admin!==true)throw Error(value.error||'Admin access could not be verified.');unlocked=true;announce();status.textContent='';if(managed){unlockForm.hidden=true;await openControlCenter()}else expandAdmin()}catch(error){status.textContent=error.message}finally{submit.disabled=false}};
 refreshAdminAuthorization();window.addEventListener('focus',refreshAdminAuthorization);



 // Personal logical quota, not an estimate of physical R2 usage or shared assets.
 const quota=document.createElement('section');quota.className='panel';quota.innerHTML='<h3>Personal cloud storage</h3><p class="muted">Your saved documents and Anki decks share a 500 MB quota. Shared academic files and progress snapshots are excluded.</p><progress max="500000000" value="0" aria-label="Personal cloud storage used" hidden></progress><p role="status">Open settings to check your usage.</p><button type="button" data-personal-quota-refresh>Refresh storage</button>';
 dialog.querySelector('.admin-frame').append(quota);
 const quotaStatus=quota.querySelector('[role=status]'),meter=quota.querySelector('progress'),quotaButton=quota.querySelector('button');
 let quotaGeneration=0;
 async function readQuota(){
  const generation=++quotaGeneration;quotaButton.disabled=true;meter.hidden=true;quotaStatus.textContent='Checking personal storage…';
  try{
   const response=await fetch('/api/materials?quota=1',{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw Error(response.status===401?'Sign in to see your storage quota.':'Storage quota is unavailable; retry.');
   const {usedBytes,limitBytes}=await response.json();
   if(!Number.isSafeInteger(usedBytes)||usedBytes<0||!Number.isSafeInteger(limitBytes)||limitBytes<=0)throw Error('Storage quota is unavailable; retry.');
   if(generation!==quotaGeneration||!dialog.open)return;
   meter.max=limitBytes;meter.value=Math.min(usedBytes,limitBytes);meter.hidden=false;
   const mb=n=>(n/1000000).toFixed(n<10000000?2:1)+' MB';
   quotaStatus.textContent=mb(usedBytes)+' of '+mb(limitBytes)+' used · '+mb(Math.max(0,limitBytes-usedBytes))+' remaining';
  }catch(error){if(generation===quotaGeneration)quotaStatus.textContent=error.message||'Storage quota unavailable.'}
  finally{if(generation===quotaGeneration)quotaButton.disabled=false}
 }
 quotaButton.addEventListener('click',readQuota);
 dialog.addEventListener('close',()=>{quotaGeneration++;meter.hidden=true;quotaButton.disabled=false;quotaStatus.textContent='Open settings to check your usage.'});
 window.addEventListener('review-profile-changed',()=>{quotaGeneration++;meter.hidden=true;quotaButton.disabled=false;if(dialog.open)readQuota()});
 let busy=false,data=null,build=null,storage,reportRenderer;const fmt=n=>Number.isFinite(Number(n))?(Number(n)/1048576).toFixed(n<10485760?2:1)+' MiB':'Unavailable';
 async function read(){try{const [a,b]=await Promise.all([fetch('/api/admin-assets',{cache:'no-store'}),fetch('/site-build-info.json',{cache:'no-store'})]);const result=await a.json();if(!a.ok)throw Error(result.error||'Storage information unavailable');if(!b.ok)throw Error('Build information unavailable');data=result;build=await b.json();if(!storage){storage=await import('/site-storage.mjs?v=2');storage.bindMigration(dialog)}if(!reportRenderer)reportRenderer=(await import('/admin-report.mjs')).reportContent;paint()}catch(e){document.querySelector('#adminBody').innerHTML='<p class="notice">'+esc(e.message)+'</p><button id="refreshAdmin">Retry</button>'}}
 function localBytes(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(KEY))n+=new TextEncoder().encode(k+(localStorage.getItem(k)||'')).length}}catch{}return n}
 function paint(message=''){if(!data||!build||!reportRenderer)return;document.querySelector('#adminBody').innerHTML=reportRenderer({data,build,storage,fmt,localBytes,busy,message})}
 async function batches(files){if(busy||!files.length)return;busy=true;let done=0,failed=0,next=0;const arr=[...files];const msg=()=>{const el=document.querySelector('#adminMessage');if(el)el.textContent=`Transferring and verifying ${done} / ${arr.length} batches${failed?' · '+failed+' failed':''}…`};paint();msg();async function worker(){while(next<arr.length){const f=arr[next++];try{const r=await fetch('/api/admin-assets/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:f});const body=await r.json();if(!r.ok)throw Error(body.error||'Transfer failed');done++}catch(e){failed++;console.error('Asset batch failed',f.name,e.message)}msg()}}await Promise.all([worker(),worker(),worker()]);busy=false;await read();paint(failed?`${done} batches verified; ${failed} failed. Select the same batches again to retry.`:`All ${done} batches transferred and verified.`)}
 open.onclick=()=>{if(!dialog.open){dialog.showModal();document.documentElement.classList.add('site-settings-open');focusClose()}readQuota();refreshAdminAuthorization();if(unlocked&&!adminContent.hidden)read()};dialog.addEventListener('close',()=>document.documentElement.classList.remove('site-settings-open'));dialog.addEventListener('click',e=>{if(e.target.closest('#closeSiteAdmin'))dialog.close();if(e.target.closest('#refreshAdmin'))read()});dialog.addEventListener('change',async e=>{const t=e.target;if(t.id==='assetBatchFiles')await batches(t.files);if(t.id==='adminReportFile'&&t.files[0]){try{const r=await fetch('/api/admin-assets/report',{method:'POST',headers:{'Content-Type':'application/json'},body:await t.files[0].text()}),body=await r.json();if(!r.ok)throw Error(body.error);await read();paint('Measured build size recorded.')}catch(err){paint(err.message)}}});
})();
