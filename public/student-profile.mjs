import {VERIFIED_GROUPS} from './verified-groups.mjs';
const prefix='alfaisal-review-studio-v1';
let groupConfig=VERIFIED_GROUPS,groupRequest=null;
const validLab=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=30;
function mergeGroups(rows){
 if(!Array.isArray(rows))throw Error('Invalid group configuration');
 const next=VERIFIED_GROUPS.map(g=>({...g,labGroups:[...g.labGroups]}));
 for(const g of rows){
  if(!g||!['M1','M2','F1','F2'].includes(g.studentGroup)||!['A','B'].includes(g.studentSection)||!Array.isArray(g.labGroups)||!g.labGroups.every(validLab))throw Error('Invalid group configuration');
  const old=next.find(x=>x.studentGroup===g.studentGroup&&x.studentSection===g.studentSection);
  old.labGroups=[...new Set(old.labGroups.concat(g.labGroups))];
 }
 return next;
}
function loadGroups(){
 if(groupRequest)return groupRequest;
 groupRequest=fetch('/api/academic-config',{cache:'no-store'}).then(async r=>{if(r.ok){const v=await r.json();groupConfig=mergeGroups(v.groups)}}).catch(()=>{}).then(()=>groupConfig).finally(()=>{groupRequest=null});
 return groupRequest;
}
function labChoices(group,section){return [...new Set(groupConfig.filter(x=>x.studentGroup===group&&x.studentSection===section).flatMap(x=>x.labGroups).filter(validLab))]}

function style(){if(document.getElementById('studentProfileStyle'))return;const link=document.createElement('link');link.id='studentProfileStyle';link.rel='stylesheet';link.href='/student-profile.css?v=147';document.head.append(link)}
function shell(title,body){style();const d=document.createElement('dialog');d.className='student-welcome';d.setAttribute('aria-labelledby','studentWelcomeTitle');d.innerHTML='<div class="student-welcome-mark" aria-hidden="true">✦</div><h2 id="studentWelcomeTitle">'+title+'</h2>'+body;document.body.append(d);return d}
export function signedOut(dismiss){if(document.getElementById('profileSignInNotice'))return;const d=shell('Your own study space','<p>Sign in to save your profile and keep your progress together across devices.</p><a class="primary student-sign-in" href="/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search+location.hash)+'" target="_top">Sign in with ChatGPT</a><button type="button" data-profile-browse>Continue browsing</button>');d.id='profileSignInNotice';d.querySelector('[data-profile-browse]').onclick=()=>d.close();d.addEventListener('close',()=>{dismiss();d.remove()},{once:true});d.showModal()}

function groupFields(required=false){const optional=required?'':' (optional)';return '<div class="student-group-fields"><label>Academic group'+optional+'<select name="group"><option value="">Not selected</option>'+['M1','M2','F1','F2'].map(g=>'<option>'+g+'</option>').join('')+'</select></label><label>Section'+optional+'<select name="section"><option value="">Not selected</option><option>A</option><option>B</option></select></label></div>'}
function groupValues(form){return {studentGroup:form.querySelector('[name=group]').value,studentSection:form.querySelector('[name=group]').value?form.querySelector('[name=section]').value:'',groupConfigured:true}}
export function groups(settings,save){style();let panel=document.getElementById('studentGroupSettings');if(!panel){panel=document.createElement('section');panel.id='studentGroupSettings';panel.className='panel';panel.innerHTML='<h3>Profile and schedule</h3>'+groupFields()+'<label>Lab group<select data-lab><option value="">Not selected</option></select></label><label class="student-settings-english"><input type="checkbox" data-english-enabled> Show English classes</label><label>English days<select data-frequency><option value="2">2 days · Monday & Wednesday</option><option value="3">3 days · Sunday, Tuesday & Thursday</option></select></label><label>Start time<select data-english-time><option value="17:00">5:00 PM</option><option value="17:30">5:30 PM</option></select></label><button type="button" data-save-preferences>Save preferences</button><div data-preference-status role="status"></div><div data-plan-warning role="status"></div><button type="button" data-reset-profile>Reset profile</button>';document.querySelector('#siteAdmin .admin-frame')?.append(panel)}const warning=panel.querySelector('[data-plan-warning]'),plan=typeof storeOptions==='function'?storeOptions().onboardingPlanWarnings:null;warning.replaceChildren();if(Array.isArray(plan?.items)&&plan.items.length){const p=document.createElement('p');p.textContent=plan.items.length+' reviews could not be placed before their deadline or within the available capacity. Today’s dates are placeholders; adjust them in the review editor.';const b=document.createElement('button');b.type='button';b.textContent='Dismiss planning warning';b.onclick=()=>{const o={...storeOptions()};delete o.onboardingPlanWarnings;saveOptions(o);warning.replaceChildren()};warning.append(p,b)}const g=panel.querySelector('[name=group]'),section=panel.querySelector('[name=section]'),lab=panel.querySelector('[data-lab]');const legacy=settings.legacyProfile&&!settings.groupConfigured;g.value=settings.studentGroup||(legacy?'M1':'');section.value=settings.studentSection||(legacy?'A':'');const initialGroup=g.value,initialSection=section.value,storedLab=settings.labGroup||(legacy&&!settings.labGroupConfigured?'1.6':'');const fill=(keepSaved=false)=>{const prior=lab.value;lab.replaceChildren(new Option('Not selected',''));for(const value of labChoices(g.value,section.value))lab.add(new Option(value,value));if(keepSaved&&g.value===initialGroup&&section.value===initialSection&&validLab(storedLab)&&!Array.from(lab.options).some(o=>o.value===storedLab))lab.add(new Option(storedLab,storedLab));lab.value=Array.from(lab.options).some(o=>o.value===prior)?prior:''};fill(true);lab.value=storedLab;g.onchange=()=>fill();section.onchange=()=>fill();loadGroups().then(()=>fill(true));panel.querySelector('[data-english-enabled]').checked=settings.englishEnabled!==false;panel.querySelector('[data-frequency]').value=String(settings.englishFrequency||2);panel.querySelector('[data-english-time]').value=settings.englishStartTime||'17:30';panel.querySelector('[data-save-preferences]').onclick=()=>{save({...groupValues(panel),labGroupConfigured:true,labGroup:lab.value,englishEnabled:panel.querySelector('[data-english-enabled]').checked,englishFrequency:Number(panel.querySelector('[data-frequency]').value),englishStartTime:panel.querySelector('[data-english-time]').value});panel.querySelector('[data-preference-status]').textContent='Schedule updated.'};panel.querySelector('[data-reset-profile]').onclick=async()=>{document.getElementById('siteAdmin')?.close();const p=await setup({reset:true});if(p){delete p._selectedReviews;save({...p,legacyProfile:false,profilePhoto:''})}}}

function appearance(d){const bar=document.createElement('div');bar.className='student-appearance';bar.setAttribute('role','group');bar.setAttribute('aria-label','Appearance');bar.innerHTML='<label title="Accent color"><input type="color" aria-label="Accent color"></label><button type="button" aria-label="Switch appearance mode"></button>';d.querySelector('.welcome-appearance-preview')?.append(bar);const color=bar.querySelector('input'),theme=bar.querySelector('button'),original=document.getElementById('themeToggle');color.value=document.getElementById('accentColor')?.value||'#5b4bd0';const paint=()=>{theme.innerHTML=original?.innerHTML||'◐';theme.setAttribute('aria-label',original?.getAttribute('aria-label')||'Switch appearance mode')};paint();theme.onclick=()=>{settings.theme=settings.theme==='amoled'?'light':'amoled';applyTheme();paint()};color.oninput=()=>{settings.accentAuto=false;settings.accent=color.value;applyTheme()};color.onchange=color.oninput}
function mountReviewProgress(progress,items){
 const groups=[];
 function checkbox(label,attrs={}){
  const wrap=document.createElement('label'),box=document.createElement('input');
  box.type='checkbox';
  for(const [key,value] of Object.entries(attrs))box.dataset[key]=value;
  wrap.append(box,document.createTextNode(label));
  return {wrap,box};
 }
 function master(label,children,name){
  const {wrap,box}=checkbox(label);
  box.setAttribute('aria-label',name);
  box.disabled=!children.length;
  groups.push({box,children});
  box.addEventListener('change',()=>{for(const child of children)child.checked=box.checked;refresh()});
  return wrap;
 }
 function refresh(){
  for(const {box,children} of groups){
   const selected=children.filter(child=>child.checked).length;
   box.checked=!!selected&&selected===children.length;
   box.indeterminate=selected>0&&selected<children.length;
  }
 }
 const columns=[[],[],[]],header=document.createElement('div');
 header.className='student-progress-row student-progress-column-controls';
 const heading=document.createElement('strong');heading.textContent='Select a review column';header.append(heading);
 progress.append(header);
 for(const x of items){
  const row=document.createElement('div'),name=document.createElement('div'),title=document.createElement('strong');
  row.className='student-progress-row';name.className='student-progress-lesson';
  title.textContent=x.code+' · '+x.title;name.append(title);row.append(name);
  const targets=[];
  columns.forEach((column,pass)=>{
   const {wrap,box}=checkbox('Review '+(pass+1),{item:x.id,pass});
   box.setAttribute('aria-label','Review '+(pass+1)+' for '+x.title);
   box.addEventListener('change',refresh);targets.push(box);column.push(box);row.append(wrap);
  });
  name.append(master('All reviews',targets,'Select all reviews for '+x.title));progress.append(row);
 }
 columns.forEach((column,pass)=>header.append(master('All review '+(pass+1),column,'Select review '+(pass+1)+' for all lessons')));
}
export function setup({reset=false,items=[]}={}){
 return new Promise(resolve=>{
  const managed=window.REVIEW_STUDIO_FRESH_ACCOUNTS===true;
  const d=shell(reset?'Reset your profile':'Welcome to Review Studio',`
   <form id="studentProfileForm">
    <h3>Your class schedule</h3>
    <label>Your name<input name="name" autocomplete="name" maxlength="100" required></label>
    ${groupFields(managed&&!reset)}
    <label>Lab group<select name="lab"><option value="">Select your lab group</option></select></label>
    <details class="student-setup-options"><summary>Optional preferences</summary>
     <label>Student number<input name="number" maxlength="30"></label>
     <label class="student-setup-english"><input type="checkbox" name="englishEnabled"> Add English classes</label>
     <div data-english-fields hidden>
      <label>English days<select name="frequency"><option value="2">Monday &amp; Wednesday</option><option value="3">Sunday, Tuesday &amp; Thursday</option></select></label>
      <label>Start time<select name="englishTime"><option value="17:00">5:00 PM</option><option value="17:30" selected>5:30 PM</option></select></label>
     </div>
     <div data-appearance><div class="welcome-appearance-preview"><strong>Appearance</strong></div></div>
     ${items.length?'<details data-review-options><summary>Import completed reviews</summary><div data-progress></div></details>':''}
    </details>
    <p class="student-profile-error" role="status"></p>
    <div class="student-wizard-actions">
     ${reset?'<button type="button" data-cancel-profile>Cancel</button>':''}
     <button class="primary" type="submit" data-next>${reset?'Save profile':'Go to Home'}</button>
    </div>
   </form>`);
  d.id='studentProfileSetup';
  const form=d.querySelector('form'),field=name=>form.elements.namedItem(name);
  const group=field('group'),section=field('section'),lab=field('lab'),name=field('name');
  const englishEnabled=field('englishEnabled');
  const status=d.querySelector('[role=status]');
  if(reset){
   const before=cleanSettings(settings);
   for(const [key,value] of Object.entries({name:before.profileName,number:before.studentNumber,group:before.studentGroup,section:before.studentSection,frequency:before.englishFrequency,englishTime:before.englishStartTime}))field(key).value=value;
   englishEnabled.checked=before.englishEnabled;
  }
  function updateLabs(preferred=lab.value){
   const values=labChoices(group.value,section.value);
   if(reset&&group.value===settings.studentGroup&&section.value===settings.studentSection&&validLab(settings.labGroup)&&!values.includes(settings.labGroup))values.push(settings.labGroup);
   lab.replaceChildren(new Option(group.value&&section.value?'Select your lab group':'Choose your group and section first',''));
   for(const value of values)lab.add(new Option(value,value));
   if(!reset&&values.length)lab.add(new Option('I’ll add it later','later'));
   lab.value=Array.from(lab.options).some(option=>option.value===preferred)?preferred:'';
   lab.disabled=!values.length;
  }
  updateLabs(reset?settings.labGroup:'');
  for(const select of [group,section])select.onchange=()=>updateLabs('');
  loadGroups().then(()=>{if(d.isConnected)updateLabs()});
  const englishFields=d.querySelector('[data-english-fields]');
  const updateEnglish=()=>englishFields.hidden=!englishEnabled.checked;
  englishEnabled.onchange=updateEnglish;
  updateEnglish();
  const reviews=d.querySelector('[data-review-options]');
  reviews?.addEventListener('toggle',()=>{if(reviews.open)mountReviewProgress(reviews.querySelector('[data-progress]'),items)},{once:true});
  const initialAppearance={theme:settings.theme,accent:settings.accent,accentAuto:settings.accentAuto};
  appearance(d);
  function finish(result){d.close();d.remove();resolve(result);}
  const cancel=()=>{Object.assign(settings,initialAppearance);applyTheme();if(reset)persist();finish(null)};
  d.addEventListener('cancel',e=>{e.preventDefault();if(reset)cancel()});
  d.querySelector('[data-cancel-profile]')?.addEventListener('click',cancel);
  form.onsubmit=e=>{
   e.preventDefault();
   const required=[name,...(managed&&!reset?[group,section,lab]:[])];
   const missing=required.find(input=>!input.value.trim());
   if(missing){status.textContent='Complete your name, academic group, section and lab group.';missing.focus();return}
   const selected={};
   d.querySelectorAll('[data-item]:checked').forEach(el=>(selected[el.dataset.item]??=[]).push(Number(el.dataset.pass)));
   finish({profileName:name.value.trim(),studentNumber:field('number').value.trim().replace(/^#+/,'').trim(),
    profileCreatedAt:new Date().toISOString(),labGroupConfigured:true,labGroup:lab.value==='later'?'':lab.value,
    englishEnabled:englishEnabled.checked,englishFrequency:Number(field('frequency').value),englishStartTime:field('englishTime').value,
    ...groupValues(d),_selectedReviews:selected});
  };
  form.noValidate=true;
  d.showModal();
 });
}
// Retain a recoverable device copy before changing accounts; never merge another
// account's records into the newly signed-in account. Existing cloud rows stay untouched.
export async function switchAccount(accountKey){if(typeof accountKey!=='string'||!accountKey.trim())throw Error('Invalid account identity.');if(window.ReviewDevice?.available){await window.ReviewDevice.switchAccount(accountKey);return}if(window.REVIEW_STUDIO_FRESH_ACCOUNTS===true)throw Error('Secure device storage is unavailable. Reconnect before switching accounts.');const keys=Object.keys(localStorage).filter(k=>k===prefix||k.startsWith(prefix+'-')),prior=localStorage.getItem(prefix+'-account')||'legacy-unassigned',archive='review-studio-account-copy:'+prior;if(prior===accountKey)return;const copy=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));localStorage.setItem(archive,JSON.stringify(copy));const stored=localStorage.getItem('review-studio-account-copy:'+accountKey),next=stored?JSON.parse(stored):{};if(!next||typeof next!=='object'||Array.isArray(next)||next[prefix+'-account']!=null&&next[prefix+'-account']!==accountKey||Object.entries(next).some(([k,v])=>!(k===prefix||k.startsWith(prefix+'-'))||typeof v!=='string'&&v!==null))throw Error('Saved account copy is invalid. Both copies are retained.');const touched=new Set([...keys,...Object.keys(next),prefix+'-account']);try{for(const key of touched)localStorage.removeItem(key);for(const [key,value]of Object.entries(next))if(value!==null&&key!==prefix+'-account')localStorage.setItem(key,value);localStorage.setItem(prefix+'-account',accountKey)}catch(error){try{for(const key of touched)localStorage.removeItem(key);for(const [key,value]of Object.entries(copy))if(value!==null)localStorage.setItem(key,value)}catch{}throw Error('Account switch did not finish. The recovery copy is retained.')}location.reload()}
