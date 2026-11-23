/* Included only by the independent managed-auth Worker. Never stores credentials. */
(async()=>{
 const response=await fetch('/auth/config',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw Error('Account service is unavailable.');const cfg=await response.json();
 const load=(src,key)=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.crossOrigin='anonymous';script.src=src;if(key)script.dataset.clerkPublishableKey=key;script.onload=resolve;script.onerror=()=>reject(Error('Secure sign-in could not load. Reconnect and retry.'));document.head.append(script)});
 await load(cfg.frontendAPI+'/npm/@clerk/ui@1/dist/ui.browser.js');await load(cfg.frontendAPI+'/npm/@clerk/clerk-js@6.44.0/dist/clerk.browser.js',cfg.publishableKey);
 await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
 const mode=document.body.dataset.authPage,mount=document.getElementById('managedAuthMount');
 if(mode==='sign-out'){
  mount.replaceChildren();const button=document.createElement('button');button.textContent='Sign out on this device';button.onclick=async()=>{button.disabled=true;try{localStorage.setItem('review-studio-managed-signed-out','1')}catch{}await window.Clerk.signOut({redirectUrl:'/auth/sign-in'})};mount.append(button);return;
 }
 if(mode){mount.replaceChildren();const options={routing:'hash',forceRedirectUrl:'/#dashboard',signInUrl:'/auth/sign-in',...(cfg.registrationClosed?{}:{signUpUrl:'/auth/sign-up'})};if(mode==='sign-up')window.Clerk.mountSignUp(mount,options);else window.Clerk.mountSignIn(mount,options);return}
 installManagedApp();
 window.addEventListener('review-admin-role',installAccountTools);document.addEventListener('click',e=>{if(e.target.closest('#openSiteAdmin'))installAccountTools()});window.addEventListener('studio-ready',installAccountTools);
 let profileFingerprint='',profileSaving=false,installing=false;
 function studyCounts(){
  const records=typeof state==='undefined'?[]:Object.values(state);
  return {
   completedReviews:records.reduce((n,r)=>n+Object.values(r.done||{}).filter(Boolean).length,0),
   answeredQuestions:records.reduce((n,r)=>n+(r.mcqs||[]).reduce((a,m)=>a+(Number(m.total)||0),0),0),
  };
 }
 window.addEventListener('review-profile-changed',syncProfile);window.addEventListener('studio-ready',syncProfile);
 async function syncProfile(){if(profileSaving||typeof settings==='undefined'||!settings.profileCreatedAt||!settings.profileName)return;profileSaving=true;try{const profile={name:settings.profileName,studentGroup:settings.studentGroup,studentSection:settings.studentSection,labGroup:settings.labGroup,englishFrequency:settings.englishFrequency,englishStartTime:settings.englishStartTime};const fingerprint=JSON.stringify(profile);if(fingerprint===profileFingerprint)return;const r=await fetch('/auth/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile})});if(r.ok)profileFingerprint=fingerprint;}catch{}finally{profileSaving=false}}
 async function getAccount(){const r=await fetch('/auth/account',{cache:'no-store'});if(!r.ok)throw Error('Account preferences unavailable.');return await r.json()}
 function installManagedApp(){
  let currentStatus, appliedStatus, lastFetch=0, pending, lastError=0;
  let refreshProfile=false, libraryInstalled=false, lastTotals=null;
  const api='/api/control-center/student/';
  async function status(force=false){
   if(pending)return pending;
   if(!force&&Date.now()-lastFetch<60000)return;
   lastFetch=Date.now();
   pending=fetch(api+'status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{
    if(value){currentStatus=value;applyStatus();shareStudyCounts();}
   }).catch(()=>{}).finally(()=>{pending=null});
   return pending;
  }
  async function shareStudyCounts(){
   if(!currentStatus?.analyticsOptIn){lastTotals=null;return;}
   if(typeof state==='undefined')return;
   const body=JSON.stringify(studyCounts());
   if(body===lastTotals)return;
   try{
    const result=await fetch(api+'study-counts',{method:'POST',headers:{'Content-Type':'application/json'},body});
    if(result.ok)lastTotals=body;
   }catch{}
  }
  document.addEventListener('review-analytics-changed',()=>status(true));
  setInterval(()=>{if(document.visibilityState==='visible')status();},300000);
  let lastInteraction=-Infinity;
  for(const event of ['pointerdown','keydown','scroll']){
   window.addEventListener(event,()=>{lastInteraction=performance.now()},{passive:true});
  }
  setInterval(()=>{
   if(!currentStatus?.analyticsOptIn||document.visibilityState!=='visible'||!document.hasFocus()||
    !navigator.onLine||performance.now()-lastInteraction>60000)return;
   fetch(api+'active-minute',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
  },60000);
  function label(text){const el=document.createElement('p');el.textContent=text;return el;}
  async function resetProfile(btn){
   if(refreshProfile||typeof settings==='undefined'||!currentStatus?.resetId)return;
   refreshProfile=true;btn.disabled=true;
   const resetId=currentStatus.resetId;
   try{
    const profile=await (await import('/student-profile.mjs?v=2')).setup({reset:true,items:[]});
    if(!profile)return;
    const {profileName,studentNumber,profileCreatedAt,studentGroup,studentSection,groupConfigured,labGroup,labGroupConfigured,englishFrequency,englishStartTime}=profile;
    Object.assign(settings,{profileName,studentNumber,profileCreatedAt,studentGroup,studentSection,groupConfigured,labGroup,labGroupConfigured,englishFrequency,englishStartTime});
    persist();
    const finish=await fetch(api+'reset-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resetId})});
    if(!finish.ok)throw Error('Profile saved on this device. Reconnect to finish the request.');
    syncProfile();await status(true);render();
   }catch(error){showNotice(error.message,'managedResetStatus');}
   finally{refreshProfile=false;btn.disabled=false;}
  }
  function showNotice(text,id){
   let notice=document.getElementById(id);
   if(!text){notice?.remove();return null;}
   if(!notice){notice=label(text);notice.id=id;notice.className='panel managed-control-notice';notice.setAttribute('role','status');document.querySelector('#content')?.before(notice);}
   else notice.textContent=text;
   return notice;
  }
  function applyStatus(){
   if(!currentStatus||!document.querySelector('#content'))return;
   const {flags,assignment,resetId}=currentStatus;
   window.reviewManagedAssignment=assignment;
   window.reviewManagedFlags=flags;
   const key=JSON.stringify({flags,assignment,resetId});
   if(key!==appliedStatus){
    appliedStatus=key;
    const notices=[flags.maintenance,flags.readOnly?'Maintenance is read-only. Keep this tab open to sync device changes when service resumes.':''].filter(Boolean);
    showNotice(notices.join(' '),'managedMaintenance');
    const reset=showNotice(resetId?'An administrator requested that you update your profile.':'','managedReset');
    if(reset){const button=document.createElement('button');button.type='button';button.textContent='Update profile';button.onclick=()=>resetProfile(button);reset.append(document.createTextNode(' '),button);}
    if(assignment||typeof render==='function')try{paintProfile();render();}catch{}
    window.reviewStudioReloadAcademicSchedule?.();
   }
  }
  function installLibrary(){
   if(libraryInstalled||typeof library!=='function')return;
   libraryInstalled=true;
   const existing=library;
   library=function(...args){
    const shared=window.reviewManagedFlags?.resourceLibrary===false?'':'<section class="panel"><button type="button" id="openManagedResources">Browse shared academic resources</button></section>';
    return shared+existing.apply(this,args);
   };
  }
  async function showResources(){
   const dialog=document.createElement('dialog');dialog.className='acc-dialog acc-dialog-small';dialog.setAttribute('aria-label','Shared academic resources');
   if(!document.querySelector('link[href="/admin-control-center.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin-control-center.css';document.head.append(link);}
   const heading=document.createElement('h2');heading.textContent='Shared academic resources';
   const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();
   const list=document.createElement('ul'),status=label('Loading…');status.setAttribute('role','status');
   const next=document.createElement('button');next.textContent='Load more';next.hidden=true;
   let offset=0;
   async function load(){
    next.disabled=true;
    try{
     const response=await fetch(api+'resources?limit=25&offset='+offset,{cache:'no-store'});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'The library could not load.');
     for(const resource of data.resources){
      if(!/^\/api\/control-center\/student\/resources\/[a-f0-9-]+\/download$/i.test(resource.downloadUrl))continue;
      const item=document.createElement('li'),link=document.createElement('a');
      link.href=resource.downloadUrl;link.textContent=resource.title;
      item.append(link,document.createTextNode(' · '+[resource.course,resource.lectureId,resource.topic].filter(Boolean).join(' / ')));list.append(item);
     }
     offset+=data.resources.length;next.hidden=offset>=data.total;
     status.textContent=offset?'':'No shared resources have been published yet.';
    }catch(error){status.textContent=error.message;}
    finally{next.disabled=false;}
   }
   next.onclick=load;dialog.append(heading,close,status,list,next);document.body.append(dialog);
   dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();await load();
  }
  function recordError(){
   if(Date.now()-lastError<60000)return;
   lastError=Date.now();
   fetch(api+'telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'application-error'}),keepalive:true}).catch(()=>{});
  }
  window.addEventListener('error',recordError);
  window.addEventListener('unhandledrejection',recordError);
  window.addEventListener('online',()=>status(true));
  window.addEventListener('focus',()=>status());
  window.addEventListener('review-profile-changed',()=>window.reviewStudioReloadAcademicSchedule?.());
  window.addEventListener('studio-ready',()=>{installLibrary();applyStatus();status();});
  document.addEventListener('click',event=>{if(event.target.closest('#openManagedResources'))showResources();});
  installLibrary();status();
 }
 async function installAccountTools(){
  if(installing)return;installing=true;try{
  const frame=document.querySelector('#siteAdmin .admin-frame');if(!frame)return;
  window.ReviewStudioReportTools?.mountSettings(frame);
  if(!document.getElementById('managedAccountPrivacy')){
   const data=await getAccount(),panel=document.createElement('section');panel.className='panel';panel.id='managedAccountPrivacy';const title=document.createElement('h3');title.textContent='Account & privacy';const label=document.createElement('label');label.className='managed-privacy-option';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=data.analyticsOptIn;label.append(checkbox,document.createTextNode('Share study totals and estimated active time with the site owner'));const link=document.createElement('a');link.href='/auth/privacy';link.textContent='Privacy details';link.target='_blank';link.rel='noopener';const status=document.createElement('p');status.setAttribute('role','status');const signout=document.createElement('a');signout.href='/auth/sign-out';signout.textContent='Sign out';panel.append(title,label,link,document.createTextNode(' · '),signout,status);frame.append(panel);
   if(window.Clerk.user&&typeof window.Clerk.openUserProfile==='function'){
    const methods=document.createElement('button');
    methods.type='button';
    methods.textContent='Manage sign-in methods';
    methods.onclick=()=>{
     const settingsDialog=document.getElementById('siteAdmin');
     try{
      if(settingsDialog?.open)settingsDialog.close();
      window.Clerk.openUserProfile();
     }catch{
      if(settingsDialog&&!settingsDialog.open)settingsDialog.showModal();
      status.textContent='Sign-in methods could not load. Try again.';
     }
    };
    panel.insertBefore(methods,status);
   }
   checkbox.onchange=async()=>{checkbox.disabled=true;try{const profile=typeof settings==='undefined'?{}:{name:settings.profileName,studentGroup:settings.studentGroup,studentSection:settings.studentSection,labGroup:settings.labGroup,englishFrequency:settings.englishFrequency,englishStartTime:settings.englishStartTime};const analytics=studyCounts();const r=await fetch('/auth/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analyticsOptIn:checkbox.checked,profile,analytics})});if(!r.ok)throw Error('Preference could not be saved.');status.textContent='Saved';document.dispatchEvent(new Event('review-analytics-changed'));}catch(error){checkbox.checked=!checkbox.checked;status.textContent=error.message}finally{checkbox.disabled=false}};
  }
  }catch{console.error('Account controls unavailable.')}finally{installing=false}
 }
})().catch(()=>{
 const mount=document.getElementById('managedAuthMount');
 if(!mount){console.error('Account service unavailable.');return}
 const message=document.createElement('p');
 message.setAttribute('role','status');
 message.textContent='Sign-in did not load. Try again, or return to sign-in to choose another method.';
 const retry=document.createElement('button');
 retry.type='button';
 retry.textContent='Retry';
 retry.onclick=()=>window.location.reload();
 const signIn=document.createElement('a');
 signIn.href='/auth/sign-in';
 signIn.textContent='Back to sign-in';
 mount.replaceChildren(message,retry,document.createTextNode(' '),signIn);
});
