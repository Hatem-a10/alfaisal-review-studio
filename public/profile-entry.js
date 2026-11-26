/* Account-aware profile presentation; existing progress remains in its original stores. */
const StudentProfile=(()=>{
 const freshAccounts=window.REVIEW_STUDIO_FRESH_ACCOUNTS===true;
 let authenticated=false,ready=false,legacy=false,loading,freshProfileConfigured=false;
 const initial=Object.keys(saved.records||{}).length>0||!!saved.settings?.profilePhoto||Number(syncMeta.revision)>0;
 const clean=v=>typeof v==='string'?v.trim().slice(0,100):'';
 let profileWait;
 function finishProfile(){
  ready=true;
  profileWait?.remove();
  profileWait=null;
  paint();
 }
 window.addEventListener('studio-ready',()=>{
  if(!freshAccounts||ready||settings.profileName&&settings.profileCreatedAt&&!settings.legacyProfile)return;
  profileWait=document.createElement('dialog');
  profileWait.className='study-next-dialog';
  profileWait.setAttribute('aria-labelledby','profileWaitTitle');
  profileWait.innerHTML='<h2 id="profileWaitTitle">Opening your study space</h2><p>Connecting to your account.</p><button type="button">Reconnect</button>';
  profileWait.querySelector('button').onclick=()=>syncCloud(true);
  profileWait.addEventListener('cancel',event=>event.preventDefault());
  document.body.append(profileWait);
  profileWait.showModal();
 });
 function identity(){const assignment=freshAccounts?window.reviewManagedAssignment:null;return {name:freshAccounts&&!freshProfileConfigured?'':clean(assignment?.name??settings.profileName)||(!freshAccounts&&legacy?'Hatem Alabrach':''),number:freshAccounts&&!freshProfileConfigured?'':clean(assignment?.studentNumber??settings.studentNumber)||(!freshAccounts&&legacy?'':'')}}
 function groupLabel(){if(freshAccounts&&!freshProfileConfigured)return 'Made by Hatem';const assigned=freshAccounts?window.reviewManagedAssignment:null;const g=assigned?.studentGroup??settings.studentGroup,section=assigned?.studentSection??settings.studentSection,lab=assigned?.labGroup??settings.labGroup;if(['M1','M2','F1','F2'].includes(g))return g+(['A','B'].includes(section)?'-'+section:'')+(lab?' / Group '+lab:'');return !freshAccounts&&!settings.groupConfigured&&(legacy||settings.legacyProfile)?'M1-A / Group 1.6':'Made by Hatem'}
 function paint(){const p=identity(),label=document.querySelector('.profile-name'),mark=document.querySelector('#profilePhotoMark');if(label){label.replaceChildren(document.createTextNode(p.name||'Your profile'));if(p.number){const small=document.createElement('small');small.className='student-number';small.textContent='#'+p.number.replace(/^#+/,'');label.append(small)}}if(mark){const photo=freshAccounts&&!freshProfileConfigured?'':cleanSettings(settings).profilePhoto;mark.innerHTML=photo?'<img src="'+esc(photo)+'" alt="'+esc(p.name||'Your')+' profile photo">':esc(p.name?p.name.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase():'?')}const group=document.querySelector('#mainSidebar .student strong');if(group)group.textContent=groupLabel();document.querySelectorAll('[data-profile-group]').forEach(el=>{const v=groupLabel();el.textContent=v;el.hidden=v==='Made by Hatem'&&!el.closest('#mainSidebar')});const remove=document.querySelector('#removeProfile');if(remove)remove.hidden=!settings.profilePhoto}
 function ui(){return loading??=import('/student-profile.mjs?v=5').catch(error=>{loading=null;throw error})}
 function reviewSetupContext(){
  const day=typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const items=typeof DATA==='undefined'?[]:DATA.items.filter(item=>!(freshAccounts&&item.course==='CVP')&&!globalThis.reviewCourseClosed?.(item.course,day));
  return {items,reviewRecords:typeof state==='undefined'?{}:state};
 }
 async function addSetupReviews(profile){
  const selected=profile._selectedReviews;
  profile.reviewQueueHidden=profile._reviewQueueHidden===true;
  delete profile._reviewQueueHidden;
  delete profile._selectedReviews;
  delete profile._renalPlanChoice;
  if(!selected||!Object.keys(selected).length||typeof state==='undefined')return;
  const {addCompletedReviews}=await import('/onboarding-plan.mjs');
  state=addCompletedReviews(reviewSetupContext().items,state,selected,new Date(profile.profileCreatedAt));
 }
 async function remote(value){authenticated=true;document.getElementById('profileSignInNotice')?.remove();const key=value.accountKey;if(!key)return true;
  const bound=localStorage.getItem(KEY+'-account');
  if(bound&&bound!==key||!bound&&!value.snapshot&&initial){await (await ui()).switchAccount(key);return false}
  localStorage.setItem(KEY+'-account',key);if(ready)return true;
  if(freshAccounts&&value.unchanged===true&&bound===key&&settings.profileName&&settings.profileCreatedAt&&!settings.legacyProfile){freshProfileConfigured=true;finishProfile();return true}
  const profile=value.snapshot?.settings;
  if(profile?.profileName&&(!freshAccounts||!profile.legacyProfile&&typeof profile.profileCreatedAt==='string'&&Number.isFinite(Date.parse(profile.profileCreatedAt)))){settings.profileName=profile.profileName;settings.studentNumber=profile.studentNumber||'';if(freshAccounts)freshProfileConfigured=true;if(!saved.settings?.profileName||!saved.settings?.groupConfigured&&profile.groupConfigured)for(const k of ['studentGroup','studentSection','groupConfigured','profileCreatedAt','legacyProfile','labGroup','labGroupConfigured','englishFrequency','englishStartTime','onboardingDate','reviewQueueHidden'])if(profile[k]!==undefined)settings[k]=profile[k];finishProfile();return true}
  if(value.snapshot&&!freshAccounts){legacy=true; // Accounts with existing snapshots retain the original legacy identity.
   if(!settings.profileName){settings.profileName='Hatem Alabrach';settings.studentNumber='';settings.legacyProfile=true}
   finishProfile();return true;
  }
  if(!freshAccounts&&settings.profileName&&(settings.profileCreatedAt||settings.legacyProfile)){finishProfile();return true}
  const p=await (await ui()).setup(reviewSetupContext());if(!p)return false;const selected=p._selectedReviews,renalChoice=p._renalPlanChoice;delete p._selectedReviews;delete p._renalPlanChoice;p.reviewQueueHidden=p._reviewQueueHidden===true;delete p._reviewQueueHidden;if(typeof DATA!=='undefined'&&selected){const plan=await import('/onboarding-plan.mjs');const now=new Date(p.profileCreatedAt);const start=plan.riyadhDate(now),finals={};for(const event of DATA.events||[]){const label=(event.title||'')+' '+(event.source||'');if(event.date>=start&&/final/i.test(label))for(const course of [...new Set(DATA.items.map(x=>x.course))])if((event.course===course||new RegExp('\\b'+course+'\\b','i').test(label))&&(!finals[course]||event.date<finals[course]))finals[course]=event.date}const breaks=typeof ACADEMIC_IMPORT==='undefined'?[]:ACADEMIC_IMPORT.breaks||[],blockedDates=typeof storeOptions==='function'?(storeOptions().customCountdowns||[]).filter(x=>!x.deleted&&x.date&&x.blocksStudy===true).map(x=>x.date):[];let renalEvents=[];if(renalChoice==='schedule'){try{const response=await fetch('/group-timetables.json',{cache:'no-cache',credentials:'same-origin'});if(response.ok)renalEvents=(await response.json()).events||[]}catch{/* Leave Renal unscheduled; the planner will report why. */}}const planned=plan.planOnboardingWithRenalChoice(reviewSetupContext().items,state,now,selected,{renalChoice,renalEvents,studentGroup:p.studentGroup,studentSection:p.studentSection,budget:p.budget??settings.budget,breaks,blockedDates,finals,bootstrapChanges:!value.snapshot&&typeof storeOptions==='function'?(storeOptions().autopilot?.lastPlan?.changes||[]):[]});state=planned.records;p.onboardingDate=start;if(planned.warnings.length&&typeof saveOptions==='function')saveOptions({...storeOptions(),onboardingPlanWarnings:{createdAt:now.toISOString(),start,items:planned.warnings}});if(planned.warnings.length)queueMicrotask(()=>{const m=planned.warnings.length+(planned.warnings.length===1?' review':' reviews')+' could not be scheduled within your constraints. Existing lecture dates were retained; unscheduled Renal reviews remain unscheduled. Open the planner to review them.';typeof toast==='function'?toast(m):console.info(m)})}Object.assign(settings,p);if(freshAccounts){settings.legacyProfile=false;freshProfileConfigured=true;}persist();finishProfile();if(freshAccounts)window.dispatchEvent(new Event('review-profile-changed'));return true;
 }
 function signedOut(){authenticated=false}
 function restoreLegacy(snapshot){if(!freshAccounts&&!snapshot.settings?.profileName){settings.profileName='Hatem Alabrach';settings.studentNumber='';settings.legacyProfile=true}paint()}
 function changed(){paint();if(freshAccounts)window.dispatchEvent(new Event('review-profile-changed'))}
 return {identity,groupLabel,paint,reviewSetupContext,addSetupReviews,remote,signedOut,restoreLegacy,changed,get accountBound(){return !!localStorage.getItem(KEY+'-account')},get ready(){return ready},get authenticated(){return authenticated}};
})();
paintProfile=()=>StudentProfile.paint();paintProfile();

window.reviewGroupLabel=()=>StudentProfile.groupLabel();document.getElementById('openSiteAdmin')?.addEventListener('click',()=>import('/student-profile.mjs?v=5').then(m=>m.groups(settings,values=>{Object.assign(settings,values);persist();paintProfile();render()})));
