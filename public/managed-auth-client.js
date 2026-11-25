/* Included only by the independent managed-auth Worker. Never stores credentials. */
(async()=>{
 const deadline=async(operation,ms=15000)=>{let timer;try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Account service timed out.')),ms)})])}finally{clearTimeout(timer)}};
 const response=await deadline(()=>fetch('/auth/config',{cache:'no-store',credentials:'same-origin'}));if(!response.ok)throw Error('Account service is unavailable.');const cfg=await response.json();
 const load=(src,key)=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.crossOrigin='anonymous';script.src=src;if(key)script.dataset.clerkPublishableKey=key;script.onload=resolve;script.onerror=()=>reject(Error('Secure sign-in could not load. Reconnect and retry.'));document.head.append(script)});
 await deadline(()=>load(cfg.frontendAPI+'/npm/@clerk/ui@1/dist/ui.browser.js'));await deadline(()=>load(cfg.frontendAPI+'/npm/@clerk/clerk-js@6.44.0/dist/clerk.browser.js',cfg.publishableKey));
 await deadline(()=>window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}}));
 const mode=document.body.dataset.authPage,mount=document.getElementById('managedAuthMount');
 if(mode==='sign-out'){
  mount.replaceChildren();const button=document.createElement('button'),status=document.createElement('p');button.type='button';button.textContent='Sign out on this device';status.setAttribute('role','status');button.onclick=async()=>{
   if(button.disabled)return;button.disabled=true;status.textContent='Signing out…';
   try{localStorage.setItem('review-studio-managed-signed-out','1')}catch{}
   try{await window.Clerk.signOut({redirectUrl:'/auth/sign-in'})}catch{status.textContent='Sign-out did not finish. Reconnect and try again.';button.disabled=false}
  };mount.append(button,status);return;
 }
 if(mode){mount.replaceChildren();const options={routing:'hash',forceRedirectUrl:new URL('/',window.location.origin).href,signInUrl:'/auth/sign-in',...(cfg.registrationClosed?{}:{signUpUrl:'/auth/sign-up'})};if(mode==='sign-up')window.Clerk.mountSignUp(mount,options);else window.Clerk.mountSignIn(mount,options);return}
 installManagedApp();
 window.addEventListener('review-admin-role',installAccountTools);document.addEventListener('click',e=>{if(e.target.closest('#openSiteAdmin'))installAccountTools()});window.addEventListener('studio-ready',installAccountTools);
 let profileFingerprint='',profileSaving=false,profileQueued=false,installing=false;
 function studyCounts(){
  const records=typeof state==='undefined'||!state||typeof state!=='object'?[]:Object.values(state);
  let completedReviews=0,answeredQuestions=0;
  for(const r of records){
   if(!r||typeof r!=='object')continue;
   if(r.done&&typeof r.done==='object'&&!Array.isArray(r.done))completedReviews+=Object.values(r.done).filter(Boolean).length;
   for(const m of Array.isArray(r.mcqs)?r.mcqs:[]){
    const total=m?.total;if(Number.isSafeInteger(total)&&total>0)answeredQuestions=Math.min(10000000,answeredQuestions+total);
   }
  }
  return {completedReviews:Math.min(100000,completedReviews),answeredQuestions};
 }
 for(const event of ['review-profile-changed','studio-ready','online','focus'])window.addEventListener(event,syncProfile);
 async function syncProfile(){
  profileQueued=true;if(profileSaving)return;
  profileSaving=true;
  try{
   while(profileQueued){
    profileQueued=false;
    if(typeof settings==='undefined'||!settings?.profileCreatedAt||!settings.profileName)continue;
    const profile={name:settings.profileName,studentGroup:settings.studentGroup,studentSection:settings.studentSection,labGroup:settings.labGroup,englishFrequency:settings.englishFrequency,englishStartTime:settings.englishStartTime},fingerprint=JSON.stringify(profile);
    if(fingerprint===profileFingerprint)continue;
    try{const r=await fetch('/auth/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile})});if(r.ok)profileFingerprint=fingerprint;}catch{}
   }
  }finally{profileSaving=false}
 }
 function privacyPayload(enabled){return enabled?{analyticsOptIn:true,analytics:studyCounts()}:{analyticsOptIn:false}}
 async function getAccount(){const r=await fetch('/auth/account',{cache:'no-store'});if(!r.ok)throw Error('Account preferences unavailable.');return await r.json()}
 function installManagedApp(){
  let currentStatus, appliedStatus, lastFetch=0, pending, forcedRefresh=false, lastError=0;
  let refreshProfile=false, libraryInstalled=false, lastTotals=null;
  const api='/api/control-center/student/';
  async function status(force=false){
   if(pending){if(force)forcedRefresh=true;return pending}
   if(!force&&Date.now()-lastFetch<60000)return;
   pending=fetch(api+'status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{
    if(value&&value.flags&&typeof value.flags==='object'&&!Array.isArray(value.flags)){lastFetch=Date.now();currentStatus=value;applyStatus();shareStudyCounts();}
   }).catch(()=>{}).finally(()=>{pending=null;if(forcedRefresh){forcedRefresh=false;return status(true)}});
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
  window.addEventListener('review-managed-controls-refresh',()=>status(true));
  setInterval(()=>{if(document.visibilityState==='visible')status();},300000);
  let lastInteraction=-Infinity;
  for(const event of ['pointerdown','keydown','scroll']){
   window.addEventListener(event,()=>{lastInteraction=performance.now()},{passive:true});
  }
  setInterval(()=>{
   if(document.visibilityState!=='visible'||!document.hasFocus()||
    !navigator.onLine||performance.now()-lastInteraction>60000)return;
   fetch(api+'active-minute',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
  },60000);
  function label(text){const el=document.createElement('p');el.textContent=text;return el;}
  async function resetProfile(btn){
   if(refreshProfile||typeof settings==='undefined'||!currentStatus?.resetId)return;
   refreshProfile=true;btn.disabled=true;
   const resetId=currentStatus.resetId;
   try{
    const profile=await (await import('/student-profile.mjs?v=3')).setup({reset:true,...StudentProfile.reviewSetupContext()});
    if(!profile)return;
    await StudentProfile.addSetupReviews(profile);
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
   const previousArchive=window.reviewManagedFlags?.archiveCvp,previousEnds=JSON.stringify(window.reviewManagedFlags?.courseEnds||{});
   window.reviewManagedFlags=flags;
   if(previousArchive!==flags.archiveCvp||previousEnds!==JSON.stringify(flags.courseEnds||{}))window.dispatchEvent(new Event('review-course-controls'));
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
  let resourceDialog=null;
  async function showResources(){
   if(resourceDialog?.open){resourceDialog.querySelector('button')?.focus();return}
   const dialog=document.createElement('dialog');resourceDialog=dialog;dialog.className='acc-dialog acc-dialog-small';dialog.setAttribute('aria-label','Shared academic resources');
   if(!document.querySelector('link[href="/admin-control-center.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin-control-center.css';document.head.append(link);}
   const heading=document.createElement('h2');heading.textContent='Shared academic resources';
   const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>dialog.close();
   const list=document.createElement('ul'),status=label('Loading…');status.setAttribute('role','status');
   const next=document.createElement('button');next.type='button';next.textContent='Load more';next.hidden=true;
   let offset=0,loading=false,controller=null;const seen=new Set();
   async function load(){
    if(loading||!dialog.open)return;
    loading=true;next.disabled=true;status.textContent='Loading…';
    controller=typeof AbortController==='function'?new AbortController():null;
    try{
     const response=await fetch(api+'resources?limit=25&offset='+offset,{cache:'no-store',...(controller?{signal:controller.signal}:{})});
     const data=await response.json();
     if(!dialog.open||resourceDialog!==dialog)return;
     if(!response.ok)throw Error('The library could not load.');
     if(!Array.isArray(data?.resources)||data.resources.length>25||!Number.isSafeInteger(data.total)||data.total<0||data.offset!==offset||data.resources.some(r=>!r||typeof r.title!=='string'||typeof r.downloadUrl!=='string'||!/^\/api\/control-center\/student\/resources\/[a-f0-9-]{36}\/download$/i.test(r.downloadUrl)))throw Error('Invalid resource page.');
     for(const resource of data.resources){
      if(seen.has(resource.downloadUrl))continue;
      const item=document.createElement('li'),link=document.createElement('a');
      link.href=resource.downloadUrl;link.textContent=resource.title;
      item.append(link,document.createTextNode(' · '+[resource.course,resource.lectureId,resource.topic].filter(v=>typeof v==='string'&&v).join(' / ')));list.append(item);seen.add(resource.downloadUrl);
     }
     offset+=data.resources.length;next.textContent='Load more';next.hidden=offset>=data.total||!data.resources.length;
     status.textContent=!data.resources.length&&offset<data.total?'The resource list changed. Close and reopen it to refresh.':offset?'':'No shared resources have been published yet.';
    }catch{if(dialog.open&&resourceDialog===dialog){status.textContent='The library could not load. Try again.';next.textContent='Retry';next.hidden=false}}
    finally{loading=false;controller=null;next.disabled=false;}
   }
   next.onclick=load;dialog.append(heading,close,status,list,next);document.body.append(dialog);
   dialog.addEventListener('close',()=>{controller?.abort();if(resourceDialog===dialog)resourceDialog=null;dialog.remove()},{once:true});
   try{dialog.showModal();await load()}catch{if(resourceDialog===dialog)resourceDialog=null;dialog.remove()}
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
   const data=await getAccount(),panel=document.createElement('section');panel.className='panel';panel.id='managedAccountPrivacy';const title=document.createElement('h3');title.textContent='Account & privacy';const label=document.createElement('label');label.className='managed-privacy-option';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=data.analyticsOptIn;label.append(checkbox,document.createTextNode('Share study totals with the site owner'));const status=document.createElement('p');status.setAttribute('role','status');const signout=document.createElement('a');signout.href='/auth/sign-out';signout.textContent='Sign out';panel.append(title,label,signout,status);frame.append(panel);
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
   checkbox.onchange=async()=>{checkbox.disabled=true;try{const r=await fetch('/auth/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(privacyPayload(checkbox.checked))});if(!r.ok)throw Error('Preference could not be saved.');status.textContent='Saved';document.dispatchEvent(new Event('review-analytics-changed'));}catch(error){checkbox.checked=!checkbox.checked;status.textContent=error.message}finally{checkbox.disabled=false}};
  }
  }catch{console.error('Account controls unavailable.')}finally{installing=false}
 }
})().catch(()=>{
 const mount=document.getElementById('managedAuthMount');
 if(!mount){
  const banner=document.createElement('section');banner.className='notice';banner.setAttribute('role','status');
  const text=document.createElement('p');text.textContent='Account controls are temporarily unavailable. Your device study data has not been cleared. Cloud actions still require secure verification.';
  const retry=document.createElement('button');retry.type='button';retry.textContent='Retry account controls';retry.onclick=()=>window.location.reload();banner.append(text,retry);
  document.body.prepend(banner);return;
 }
 const message=document.createElement('p');
 message.setAttribute('role','status');
 message.textContent='Sign-in did not load. Account verification may be temporarily unavailable. Retry when connected; do not clear browser data.';
 const retry=document.createElement('button');
 retry.type='button';
 retry.textContent='Retry';
 retry.onclick=()=>window.location.reload();
 const signIn=document.createElement('a');
 signIn.href='/auth/sign-in';
 signIn.textContent='Back to sign-in';
 mount.replaceChildren(message,retry,document.createTextNode(' '),signIn);
});
