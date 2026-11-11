/* Account-aware profile presentation; existing progress remains in its original stores. */
const StudentProfile=(()=>{
 let authenticated=false,ready=false,legacy=false,loading,guestDismissed=false;
 const initial=Object.keys(saved.records||{}).length>0||!!saved.settings?.profilePhoto||Number(syncMeta.revision)>0;
 const clean=v=>typeof v==='string'?v.trim().slice(0,100):'';
 function identity(){return {name:clean(settings.profileName)||(legacy?'Hatem Alabrach':''),number:clean(settings.studentNumber)||(legacy?'':'')}}
 function paint(){const p=identity(),label=document.querySelector('.profile-name'),mark=document.querySelector('#profilePhotoMark');if(label){label.replaceChildren(document.createTextNode(p.name||'Your profile'));if(p.number){const small=document.createElement('small');small.className='student-number';small.textContent='#'+p.number.replace(/^#+/,'');label.append(small)}}if(mark){const photo=cleanSettings(settings).profilePhoto;mark.innerHTML=photo?'<img src="'+esc(photo)+'" alt="'+esc(p.name||'Your')+' profile photo">':esc(p.name?p.name.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase():'?')}const remove=document.querySelector('#removeProfile');if(remove)remove.hidden=!settings.profilePhoto}
 function ui(){return loading??=import('/student-profile.mjs?v=1')}
 async function remote(value){authenticated=true;document.getElementById('profileSignInNotice')?.remove();const key=value.accountKey;if(!key)return true;
  const bound=localStorage.getItem(KEY+'-account');
  if(bound&&bound!==key||!bound&&!value.snapshot&&initial){await (await ui()).switchAccount(key);return false}
  localStorage.setItem(KEY+'-account',key);if(ready)return true;
  const profile=value.snapshot?.settings;
  if(profile?.profileName){settings.profileName=profile.profileName;settings.studentNumber=profile.studentNumber||'';ready=true;paint();return true}
  if(value.snapshot){legacy=true; // Accounts with existing snapshots retain the original legacy identity.
   if(!settings.profileName){settings.profileName='Hatem Alabrach';settings.studentNumber='';settings.legacyProfile=true}
   ready=true;paint();return true;
  }
  if(settings.profileName&&(settings.profileCreatedAt||settings.legacyProfile)){ready=true;paint();return true}
  const p=await (await ui()).setup();Object.assign(settings,p);persist();ready=true;paint();return true;
 }
 function signedOut(){authenticated=false;if(initial||guestDismissed)return;ui().then(m=>m.signedOut(()=>{guestDismissed=true})).catch(()=>{})}
 function restoreLegacy(snapshot){if(!snapshot.settings?.profileName){settings.profileName='Hatem Alabrach';settings.studentNumber='';settings.legacyProfile=true}paint()}
 function changed(){paint()}
 return {identity,paint,remote,signedOut,restoreLegacy,changed,get accountBound(){return !!localStorage.getItem(KEY+'-account')},get ready(){return ready},get authenticated(){return authenticated}};
})();
paintProfile=()=>StudentProfile.paint();paintProfile();
