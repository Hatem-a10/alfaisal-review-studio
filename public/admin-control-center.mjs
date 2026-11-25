import {csvRows} from './admin-csv.mjs';
const apiRoot = '/api/control-center/';
const tabs = {
 overview:'Overview', students:'Students', roles:'Roles & Permissions', academics:'Academic Management',
 resources:'Resource Library', reports:'Question Bank & Reports', announcements:'Announcements',
 analytics:'Analytics', storage:'Storage & Backups', audit:'Security & Audit Logs', site:'Site Controls',
};
const classes = ['M1','M2','F1','F2'];
const sectionIcons={
 overview:'M3 3h7v8H3z M14 3h7v5h-7z M3 15h7v6H3z M14 12h7v9h-7z',
 students:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M22 21a6 6 0 0 0-5-6',
 roles:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
 academics:'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M8 2v4 M16 2v4 M3 10h18 M8 14h3 M8 17h6',
 resources:'M3 4h4v16H3z M10 4h4v16h-4z M16 5l4-1 3 15-4 1z',
 reports:'M4 4h16v12H8l-4 4z M12 7v4 M12 13.5h.01',
 announcements:'M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z M16 8a5 5 0 0 1 0 8 M19 5a9 9 0 0 1 0 14',
 analytics:'M3 20h18 M6 16v-5 M11 16V7 M16 16v-8 M21 16V4',
 storage:'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
 audit:'M12 3a9 9 0 1 0 9 9 M12 7v5l3 2 M17 3h4v4',
 site:'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M16 4v4 M10 10v4 M18 16v4',
};
// Navigation groups: Overview, then people, content, insights and site settings.
const sectionGroups=[['','overview'],['People','students','roles'],['Content','academics','resources','reports','announcements'],['Insights','analytics','storage','audit'],['Site','site']];
const sectionHints={students:'Find accounts and edit profiles',roles:'Editors, moderators and permissions',academics:'Groups, schedules and revisions',resources:'Shared files and their integrity',reports:'Question reports and corrections',announcements:'Messages to classes and groups',analytics:'Opt-in study activity',storage:'Usage and backups',audit:'Sign-ins and security events',site:'Flags, maintenance and course dates'};
function sectionIcon(section){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','acc-nav-icon');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',sectionIcons[section]||sectionIcons.overview);svg.append(path);return svg;
}
const css = '/admin-control-center.css';
const formatDate = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : '—';
const bytes = value => value==null?'Unavailable':new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(value/1048576)+' MiB';

function node(tag,text,attributes={}) {
 const element=document.createElement(tag);
 if(text!=null)element.textContent=String(text);
 for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
 return element;
}
function button(label, handler, cssClass) {
 const el=node('button',label,{type:'button'});
 if(cssClass)el.className=cssClass;
 el.addEventListener('click',handler);
 return el;
}
async function request(path, options={}, retried=false) {
 const response=await fetch(apiRoot+path,{cache:'no-store',credentials:'same-origin',...options});
 const data=await response.json().catch(()=>({}));
 // A stale sign-in is refreshed in place with an emailed code, then the request is retried once.
 if(!response.ok&&data.reauthenticate===true&&!retried&&await reverifyIdentity())return request(path,options,true);
 if(!response.ok)throw Object.assign(new Error(data.error||'The request could not be completed.'),{status:response.status,reauthenticate:data.reauthenticate===true});
 return data;
}
/**
 * Fresh first-factor verification without signing out: Clerk session reverification
 * with an email code. The server still requires a verification from the last 10 minutes;
 * this only changes how the owner provides it. Resolves true once the session token
 * carries the new verification.
 */
export async function reverifyIdentity(clerk=globalThis.Clerk){
 const session=clerk?.session,emailAddressId=clerk?.user?.primaryEmailAddressId,email=clerk?.user?.primaryEmailAddress?.emailAddress||'your email';
 if(!session?.startVerification||!emailAddressId)return false;
 const send=async()=>{await session.startVerification({level:'first_factor'});await session.prepareFirstFactorVerification({strategy:'email_code',emailAddressId});};
 try{await send();}catch{return false;}
 const code=field('code','Verification code',{required:true,maxLength:8});
 const input=code.querySelector('input');input.inputMode='numeric';input.autocomplete='one-time-code';input.pattern='[0-9]{6,8}';
 const resend=button('Send a new code',async event=>{event.currentTarget.disabled=true;try{await send();}finally{event.currentTarget.disabled=false;}},'acc-link');
 const result=await openForm('Confirm it’s you',[node('p','Enter the code sent to '+email+'. You stay signed in.'),code,resend],'Verify',async values=>{
  const attempt=await session.attemptFirstFactorVerification({strategy:'email_code',code:String(values.code||'').trim()});
  if(attempt?.status!=='complete')throw new Error('That code did not complete verification. Check it and try again.');
  await session.getToken({skipCache:true});
  return true;
 });
 return result===true;
}
const json = payload => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
const query = values => '?' + new URLSearchParams(values);
function field(name,label,options={}) {
 const wrap=node('label',label);
 const type=options.type||'text';
 const input=node(options.choices?'select':type==='textarea'?'textarea':'input');
 input.name=name;
 if(options.choices){
  for(const choice of options.choices){
   const [value,title]=Array.isArray(choice)?choice:[choice,choice];
   input.append(new Option(title,value));
  }
 }else if(type!=='textarea')input.type=type;
 if(options.required)input.required=true;
 if(options.maxLength)input.maxLength=options.maxLength;
 if(options.accept)input.accept=options.accept;
 if(type==='checkbox')input.checked=!!options.value;
 else if(type!=='file')input.value=options.value??'';
 if(type==='textarea')input.rows=options.rows||4;
 wrap.append(input);
 return wrap;
}
function formValues(form) {
 const result=Object.fromEntries(new FormData(form));
 for(const input of form.querySelectorAll('input[type=checkbox]'))result[input.name]=input.checked;
 return result;
}
function table(columns, rows, empty='Nothing to show yet.') {
 if(!rows.length)return node('p',empty,{class:'acc-empty'});
 const container=node('div',null,{class:'acc-table-scroll',tabindex:'0',role:'region','aria-label':'Data table'});
 const output=node('table'),head=node('thead'),header=node('tr'),body=node('tbody');
 for(const title of columns)header.append(node('th',title,{scope:'col'}));
 head.append(header);
 for(const items of rows){
  const row=node('tr');
  for(const item of items){
   const cell=node('td');
   if(item instanceof Node)cell.append(item);else cell.textContent=item??'—';
   row.append(cell);
  }
  body.append(row);
 }
 output.append(head,body);
 container.append(output);
 return container;
}
function actions(...items){const row=node('div',null,{class:'acc-actions'});row.append(...items.filter(Boolean));return row;}
function initials(name){return (name||'Student').split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase();}
function studentIdentity(person,photo){
 const root=node('div',null,{class:'acc-identity'});
 const avatar=node('span',initials(person.name),{class:'acc-avatar','aria-hidden':'true'});
 if(photo){
  const image=node('img',null,{src:photo,alt:'',referrerpolicy:'no-referrer'});
  image.addEventListener('error',()=>image.remove(),{once:true});
  avatar.append(image);
 }
 const name=node('div');name.append(node('strong',person.name||'New student'),node('small',person.email));
 root.append(avatar,name);
 return root;
}
function minutes(value){
 if(value==null)return 'No time recorded';
 return value<60?value+' min':Math.floor(value/60)+' h '+value%60+' min';
}
function cards(entries) {
 const row=node('div',null,{class:'acc-metrics'});
 for(const [label,value] of entries){
  const card=node('div',null,{class:'acc-card'});
  card.append(node('span',label),node('strong',value??'—'));
  row.append(card);
 }
 return row;
}
function openForm(title, fields, submitLabel='Save', submit) {
 return new Promise(resolve=>{
  const dialog=node('dialog',null,{class:'acc-dialog acc-dialog-small','aria-label':title});
  const form=node('form');
  const status=node('p',null,{role:'status',class:'acc-status'});
  const save=node('button',submitLabel,{class:'primary',type:'submit'});
  form.append(node('h2',title),...fields,status,actions(button('Cancel',()=>dialog.close()),save));
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   save.disabled=true;status.textContent='';
   try{
    const values=formValues(form);
    const result=submit?await submit(values,form):values;
    resolve(result);
    dialog.close();
   }catch(error){
    status.textContent=error.message;
    if(error.reauthenticate){
     const link=node('a','Sign in again to verify',{href:'/auth/sign-out'});
     status.append(' ',link);
     link.focus();
    }
   }
   finally{save.disabled=false;}
  });
  dialog.addEventListener('close',()=>{dialog.remove();resolve(null);},{once:true});
  dialog.append(form);document.body.append(dialog);dialog.showModal();
 });
}
function confirm(title, wording) {return openForm(title,[node('p',wording)],'Confirm',()=>true);}
const publicFlags = {readOnly:'Read-only maintenance',sharedUploads:'Shared uploads',reports:'Question reporting',resourceLibrary:'Shared resource library',archiveCvp:'Enable Archive for all users'};

let active;
export async function openAdminCenter(){
 if(active?.open)return;
 const access=await request('access');
 if(access.role==='owner'&&!access.unlocked)throw new Error('Unlock Admin Settings first.');
 if(!document.querySelector('link[href="'+css+'"]'))document.head.append(node('link',null,{rel:'stylesheet',href:css}));
 const dialog=node('dialog',null,{class:'acc-dialog acc-center','aria-labelledby':'acc-title'});
 active=dialog;
 const header=node('header',null,{class:'acc-head'});
 const title=node('div');
 title.append(node('h2','Admin Control Center',{id:'acc-title'}),node('p',({owner:'Owner',editor:'Content editor',moderator:'Moderator'})[access.role],{class:'acc-role'}));
 const close=button('',()=>dialog.close(),'acc-close');close.setAttribute('aria-label','Close Admin Control Center');close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';close.autofocus=true;
 header.append(title,close);
 const layout=node('div',null,{class:'acc-layout'});
 const navigation=node('nav',null,{'aria-label':'Administration sections'});
 const main=node('section',null,{class:'acc-content','aria-label':'Selected admin section'});
 const heading=node('h3');
 const status=node('p',null,{role:'status',class:'acc-status'});
 const panel=node('div',null,{class:'acc-panel'});
 main.append(heading,status,panel);
 layout.append(navigation,main);
 dialog.append(header,layout);
 dialog.addEventListener('close',()=>{dialog.remove();if(active===dialog)active=null;});
 document.body.append(dialog);
 dialog.showModal();
 const nav=new Map();
 let selected, viewVersion=0;

 function pager(page,more,load){
  return actions(button('Previous',()=>load(page-1),null),node('span','Page '+(page+1)),button('Next',()=>load(page+1)));
 }
 function appendPager(page,more,load){
  if(!page&&!more)return;
  const bar=pager(page,more,load);
  bar.firstElementChild.disabled=page===0;
  bar.lastElementChild.disabled=!more;
  panel.append(bar);
 }
 function confirmOwner(){
  return openForm('Confirm owner access',[field('phrase','Admin phrase',{type:'password',required:true})],'Verify',values=>request('challenge',json(values)));
 }
 async function mutation(path,payload) {
  const options=payload instanceof FormData?{method:'POST',body:payload}:json(payload);
  try{return await request(path,options);}
  catch(error){
   if(error.status!==428||access.role!=='owner')throw error;
   const passed=await confirmOwner();
   if(!passed)return null;
   return request(path,options);
  }
 }
 function rowAction(label, work, {reload=true}={}){
  return button(label,async event=>{
   const target=event.currentTarget;target.disabled=true;status.textContent='';
   try{
    const result=await work();
    if(result){
     if(reload)await load(selected);
     if(dialog.open)status.textContent=result.message||'Saved.';
    }
   }catch(error){status.textContent=error.message;}
   finally{target.disabled=false;}
  });
 }
 function searchBar(fields,onSearch){
  const form=node('form',null,{class:'acc-filter'});
  form.append(...fields,node('button','Search',{type:'submit'}));
  form.addEventListener('submit',event=>{event.preventDefault();onSearch(new URLSearchParams(new FormData(form)));});
  return form;
 }
 async function put(section,action,data,title,message){
  if(title&&!await confirm(title,message))return null;
  return mutation(section+'/'+action,data);
 }
 async function editProfile(student,profile){
  const config=await fetch('/api/academic-config',{cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null);
  const classField=field('studentGroup','Class',{choices:[['','Not selected'],...classes],value:profile.studentGroup});
  const sectionField=field('studentSection','Section',{choices:[['','Not selected'],'A','B'],value:profile.studentSection});
  const labField=config?.groups?field('labGroup','Lab group',{choices:[]}):field('labGroup','Verified lab group',{value:profile.labGroup,maxLength:30});
  if(config?.groups){
   const group=classField.querySelector('select'),section=sectionField.querySelector('select'),lab=labField.querySelector('select');
   const update=value=>{
    const labs=config.groups.find(entry=>entry.studentGroup===group.value&&entry.studentSection===section.value)?.labGroups||[];
    lab.replaceChildren(new Option('Not selected',''),...labs.map(code=>new Option(code,code)));
    lab.value=labs.includes(value)?value:'';
   };
   for(const input of [group,section])input.addEventListener('change',()=>update(lab.value));
   update(profile.labGroup);
  }
  return openForm('Edit student information',[
   field('name','Display name',{value:profile.name||student.name,maxLength:100,required:true}),
   field('studentNumber','Student number override',{value:profile.studentNumberOverride,maxLength:30}),
   classField,sectionField,labField,
   field('englishFrequency','English days',{choices:[['2','Monday and Wednesday'],['3','Sunday, Tuesday and Thursday']],value:String(profile.englishFrequency)}),
   field('englishStartTime','English start',{choices:[['17:00','5:00 PM'],['17:30','5:30 PM']],value:profile.englishStartTime}),
  ],'Save profile',values=>mutation('students/profile',{id:student.id,...values,englishFrequency:Number(values.englishFrequency)}));
 }
 async function studentDetails(person){
  const result=await request('students/details'+query({id:person.id}));
  const detail=node('dialog',null,{class:'acc-dialog acc-student-detail','aria-label':'Student details'});
  const header=node('div',null,{class:'acc-detail-header'});
  header.append(studentIdentity(person,result.photo),button('Close',()=>detail.close()));
  const sessionRows=result.sessions?.map(session=>[
   formatDate(session.createdAt),session.device||'Unavailable',session.browser||'Unavailable',formatDate(session.lastActiveAt),
  ])||[];
  const details=node('section',null,{class:'acc-detail-body'});
  const {studentGroup,studentSection,labGroup,studentNumberOverride}=result.profile;
  const group=[studentGroup,studentSection].filter(Boolean).join('-')+(labGroup?' · '+labGroup:'');
  details.append(cards([['Account',person.suspended?'Suspended':'Active'],['Academic group',group||'Unset'],['Estimated active time',minutes(result.activeMinutes)],
   ...(studentNumberOverride?[['Student number override',studentNumberOverride]]:[])]),
   node('h3','Recent sign-ins'),
   table(['Signed in','Device','Browser','Last active'],sessionRows,result.sessions?'No recent sessions.':'Clerk session history is unavailable.'));
  const note=node('p',null,{role:'status',class:'acc-status'});
  if(person.role!=='owner'){
   const edit=button('Edit information',async()=>{
    edit.disabled=true;note.textContent='';
    try{
     if(await editProfile(person,result.profile)){detail.close();await load('students');status.textContent='Profile saved.';}
    }catch(error){note.textContent=error.message;}
    finally{edit.disabled=false;}
   },'primary');
   details.append(actions(edit));
  }
  detail.append(header,details,note);
  detail.addEventListener('close',()=>detail.remove(),{once:true});
  document.body.append(detail);
  detail.showModal();
 }
 async function showStudentStorage(student){
  const record=await request('students/storage'+query({id:student.id}));
  await openForm('Account storage totals',[
   cards([['Registered files',record.files],['Registered file bytes',bytes(record.registeredBytes)],['Database progress row',bytes(record.progressRowBytes)],['R2 objects',record.objects],['R2 bytes'+(record.partial?' (partial)':''),bytes(record.r2Bytes)]]),
  ],'Done',()=>true);
 }
 async function students(roleOnly=false, params=new URLSearchParams(), page=0,version=viewVersion,cursors=[null]){
  const values=Object.fromEntries(params);
  const data=await request((roleOnly?'roles':'students')+'/list'+query({...values,page,...(cursors[page]?{cursor:cursors[page]}:{})}));
  if(version!==viewVersion)return;
  panel.replaceChildren(searchBar([
   field('q','Name or verified email',{value:values.q}),
   field('class','Class',{choices:[['','All classes'],...classes],value:values.class}),
   field('group','Section',{choices:[['','All sections'],'A','B'],value:values.group}),
   field('lab','Lab group',{value:values.lab}),
   field('status','Account',{choices:[['','All accounts'],['active','Active'],['suspended','Suspended']],value:values.status}),
  ],p=>within(()=>students(roleOnly,p,0,version))));
  const rows=data.students.map(person=>{
   const name=studentIdentity(person);
   if(roleOnly){
    const controls=person.role==='owner'?node('span','Protected'):rowAction('Change role',()=>openForm('Change role',[
     field('role','Role',{choices:[['student','Student'],['editor','Content Editor'],['moderator','Moderator']],value:person.role}),
    ],'Save role',values=>mutation('roles/set',{id:person.id,...values})));
    return [name,person.role,controls];
   }
   const options=[rowAction('Storage totals',()=>showStudentStorage(person),{reload:false})];
   if(person.role!=='owner'){
    options.push(
     rowAction(person.suspended?'Reactivate':'Suspend',()=>put('students','suspend',{id:person.id,suspended:!person.suspended},person.suspended?'Reactivate this student?':'Suspend this student?','This changes access to Review Studio.')),
     rowAction('Revoke sessions',async()=>{
      const result=await put('students','revoke',{id:person.id},'Revoke Clerk sessions?','The student will need to sign in again.');
      return result&&{message:result.revoked+' sessions revoked.'+(result.partial?' Some sessions may remain.':'')};
     }),
     rowAction('Clear group correction',()=>put('students','clear-assignment',{id:person.id},'Clear group correction?','The student’s own group selection will apply.')),
     rowAction('Clear profile corrections',()=>put('students','clear-profile',{id:person.id},'Clear profile corrections?','The student’s own profile and schedule settings will apply.')),
     rowAction('Reset onboarding',()=>put('students','reset',{id:person.id,confirm:'RESET ONBOARDING'},'Request onboarding again?','The student will be asked to complete profile setup. Existing study progress is preserved.')),
    );
   }
   const menu=node('details',null,{class:'acc-student-actions'});menu.append(node('summary','Actions'),actions(...options));
   const card=node('article',null,{class:'acc-student-card'});
   const chips=node('div',null,{class:'acc-chips'});
   const group=[person.studentGroup,person.studentSection].filter(Boolean).join('-')+(person.labGroup?' · '+person.labGroup:'');
   chips.append(node('span',person.suspended?'Suspended':'Active',{'data-suspended':person.suspended}),node('span',group||'Group unset'),
    node('span',person.onboarding==='complete'?'Onboarded':person.onboarding==='reset requested'?'Profile reset requested':'Onboarding pending'));
   const identity=node('div');identity.append(name,chips);
   const controls=actions(rowAction('View account',()=>studentDetails(person),{reload:false}),menu);
   const dates=node('small','Joined '+formatDate(person.createdAt)+' · Last active '+formatDate(person.lastActive));
   card.append(identity,controls,dates);
   return card;
  });
  if(roleOnly)panel.append(table(['Student','Role','Action'],rows,'No accounts match these filters.'));
  else if(rows.length){
   const list=node('div',null,{class:'acc-student-list'});
   list.append(...rows);
   panel.append(list);
  }else panel.append(node('p','No accounts match these filters.',{class:'acc-empty'}));
  appendPager(page,!!data.nextCursor,n=>{
   if(n<0)return;
   if(n>page&&!data.nextCursor)return;
   const history=n>page?[...cursors.slice(0,page+1),data.nextCursor]:cursors;
   within(()=>students(roleOnly,params,n,version,history));
  });
 }
 async function academics(version){
  const current=await request('academics/config');
  const groups=await fetch('/api/academic-config',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
  if(version!==viewVersion)return;
  const config=current.draft?.configuration||current.active?.configuration||{};
  const form=node('form',null,{class:'acc-editor'});
  const template={groups:config.groups||groups.groups||[],events:config.events||[],categories:config.categories||[]};
  const advanced=node('details');
  advanced.append(node('summary','Edit as JSON'),field('config','Schedule, groups and categories',{
   type:'textarea',rows:14,value:JSON.stringify(template,null,2),required:true,
  }));
  const draftRows=node('div');
  const lookup=()=>JSON.parse(form.elements.config.value);
  function fill(config){
   form.elements.config.value=JSON.stringify(config,null,2);
   drawDraft(config);
  }
  function drawDraft(config){
   draftRows.replaceChildren(cards([['Academic groups',config.groups.length],['Shared events',config.events.length],['Categories',config.categories.length]]));
   draftRows.append(table(['Event','Date or weekday','Audience','Time','Actions'],config.events.map(event=>[
    event.title,event.date||event.day,[event.studentGroup,event.studentSection,event.labGroup].filter(Boolean).join(' / ')||'All',
    event.startTime+'–'+event.endTime,
    actions(button('Edit',()=>within(()=>editEvent(event))),button('Remove from draft',()=>{
     try{const next=lookup();next.events=next.events.filter(item=>item.id!==event.id);fill(next);}
     catch(error){status.textContent=error.message;}
    })),
   ]),'No shared events in this draft.'));
  }
  async function editEvent(event={}){
   const config=lookup();
   const values=await openForm(event.id?'Edit shared event':'New shared event',[
    field('title','Title',{value:event.title,required:true,maxLength:120}),
    field('type','Type',{choices:['lecture','lab','exam','tbl','deadline','english','other'],value:event.type||'lecture'}),
    field('date','Date',{type:'date',value:event.date}),
    field('day','Or repeat on weekday',{choices:[['','Choose a weekday'],'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],value:event.day}),
    field('startTime','Start in Riyadh',{type:'time',required:true,value:event.startTime}),
    field('endTime','End in Riyadh',{type:'time',required:true,value:event.endTime}),
    field('course','Course',{choices:[['','All courses'],'CVP','MOL 114','REN 123','FND'],value:event.course}),
    field('studentGroup','Class',{choices:[['','All classes'],...classes],value:event.studentGroup}),
    field('studentSection','Section',{choices:[['','All sections'],'A','B'],value:event.studentSection}),
    field('labGroup','Lab group',{value:event.labGroup,maxLength:30}),
    field('room','Room',{value:event.room,maxLength:100}),
    field('lecturer','Lecturer',{value:event.lecturer,maxLength:100}),
    field('categoryId','Category',{choices:[['','Uncategorized'],...config.categories.map(c=>[c.id,c.label])],value:event.categoryId}),
    field('replacesId','Existing schedule event ID to replace',{value:event.replacesId,maxLength:160}),
   ],'Apply to draft',entered=>{
    if(Boolean(entered.date)===Boolean(entered.day))throw Error('Choose either a date or a recurring weekday.');
    if(entered.startTime>=entered.endTime)throw Error('End time must be after start time.');
    return entered;
   });
   if(!values)return;
   const newEvent=Object.fromEntries(Object.entries({...values,id:event.id||crypto.randomUUID()}).filter(([,value])=>value!==''));
   const index=config.events.findIndex(item=>item.id===newEvent.id);
   if(index<0)config.events.push(newEvent);else config.events[index]=newEvent;
   fill(config);
  }
  async function editLabs(){
   const config=lookup();
   const values=await openForm('Set class lab groups',[
    field('group','Class and section',{choices:config.groups.map(group=>group.studentGroup+'-'+group.studentSection),value:config.groups[0]&&config.groups[0].studentGroup+'-'+config.groups[0].studentSection}),
    field('labs','Lab groups (comma separated)',{required:true}),
   ],'Apply to draft');
   if(!values)return;
   const group=config.groups.find(group=>group.studentGroup+'-'+group.studentSection===values.group);
   if(group)group.labGroups=values.labs.split(',').map(lab=>lab.trim()).filter(Boolean);
   fill(config);
  }
  async function editCategories(){
   const config=lookup();
   const values=await openForm('Curriculum categories',[field('categories','One category label per line',{type:'textarea',value:config.categories.map(c=>c.label).join('\n')})],'Apply to draft');
   if(!values)return;
   config.categories=[...new Set(values.categories.split('\n').map(item=>item.trim()).filter(Boolean))].map(label=>config.categories.find(c=>c.label===label)||{id:crypto.randomUUID(),label});
   fill(config);
  }
  drawDraft(template);
  form.append(actions(button('Add schedule event',()=>within(()=>editEvent())),button('Edit lab groups',()=>within(editLabs)),
   button('Edit categories',()=>within(editCategories))),draftRows,advanced);
  const preview=node('div',null,{class:'acc-preview'});
  const save=node('button','Validate and save draft',{type:'submit',class:'primary'});
  form.append(save,preview);
  form.addEventListener('submit',async event=>{
   event.preventDefault();save.disabled=true;status.textContent='';
   try{
    const candidate=JSON.parse(formValues(form).config);
    const result=await mutation('academics/save-draft',{configuration:candidate});
    if(!result)return;
    const revisionId=result.draft?.id;
    if(!revisionId)throw Error('Draft was saved but its revision ID was not returned.');
    const events=candidate.events||[];
    preview.replaceChildren(node('h4','Draft preview'),
     cards([['Academic groups',candidate.groups?.length],['Events',events.length],['Categories',candidate.categories?.length]]),
     table(['Title','Type','Date or day','Time','Audience'],events.slice(0,50).map(e=>[e.title,e.type,e.date||e.day,[e.startTime,e.endTime].filter(Boolean).join('–'),[e.studentGroup,e.studentSection,e.labGroup].filter(Boolean).join(' / ')||'All']),'This draft has no additional events.'),
     rowAction('Publish draft',()=>put('academics','publish',{revisionId},'Publish academic changes?','The shared schedules and group options will update for matching students.')));
   }catch(error){
    status.textContent=error.message;
    if(error.reauthenticate){
     const link=node('a','Sign in again to verify',{href:'/auth/sign-out'});
     status.append(' ',link);
     link.focus();
    }
   }
   finally{save.disabled=false;}
  });
  panel.append(form,node('h4','Revision history'),table(['Revision','Status','Created','Action'],(current.revisions||[]).map(revision=>{
   const id=revision.id||revision.revisionId;
   const phase=revision.status||revision.state;
   const action=phase==='draft'?(current.draft?.id===id?rowAction('View draft',async()=>{
    const source=current.draft?.id===id?current.draft.configuration:null;
    if(!source)throw Error('Open the draft through the configuration endpoint.');
    form.elements.config.value=JSON.stringify(source,null,2);
   },{reload:false}):node('span','Historical draft')):rowAction('Roll back',()=>put('academics','rollback',{revisionId:id},'Restore this academic revision?','This publishes the selected configuration again.'));
   return [id,phase,formatDate(revision.createdAt||revision.created_at),action];
  }),'No academic revisions yet.'));
 }
 function resourceForm(item){
  const replace=!!item;
  return openForm(replace?'Replace shared resource':'Upload shared resource',[
   field('file','PDF, image or Anki package',{type:'file',accept:'.pdf,.png,.webp,.jpeg,.jpg,.apkg,.colpkg',required:true}),
   field('title','Title',{required:true,value:item?.title,maxLength:180}),
   field('course','Course',{choices:['CVP','MOL','REN','OTHER'],value:item?.course||'CVP',required:true}),
   field('lectureId','Lecture ID',{value:item?.lectureId,maxLength:80}),
   field('topic','Topic',{value:item?.topic,maxLength:100}),
  ],replace?'Replace':'Upload',(_values,form)=>{
   const payload=new FormData(form);
   if(replace)payload.set('id',item.id);
   return mutation('resources/'+(replace?'replace'+query({id:item.id}):'upload'),payload);
  });
 }
 async function resources(params=new URLSearchParams(),page=0,version=viewVersion){
  const filters=Object.fromEntries(params);
  const data=await request('resources/list'+query({...filters,limit:25,offset:page*25}));
  if(version!==viewVersion)return;
  panel.replaceChildren(actions(rowAction('Upload resource',()=>resourceForm()),rowAction('Check resource links',async()=>{
   const check=await request('resources/integrity'+query({limit:25,offset:page*25}));
   await openForm('Resource link check',[node('p',check.checked+' checked. '+check.broken+' unavailable.'),table(['Resource','Status'],(check.links||[]).map(r=>[r.title||r.id,r.integrity||r.status||r.error]),'No unavailable links on this page.')],'Done',()=>true);
  },{reload:false})),searchBar([
   field('q','Search resources',{value:filters.q}),
   field('course','Course',{value:filters.course}),
   field('status','Visibility',{choices:[['','All'],['active','Active'],['archived','Archived']],value:filters.status}),
  ],p=>within(()=>resources(p,0,version))));
  panel.append(table(['Resource','Course, lecture and topic','Size','Uploaded','Status','Action'],(data.resources||[]).map(item=>{
   const label=node('div');label.append(node('strong',item.title),node('small',item.type||item.mime));
   const menu=node('details');
   menu.append(node('summary','Actions'),actions(
    rowAction('History',async()=>{const history=await request('resources/revisions'+query({id:item.id}));await showDetails('Resource history',history.revisions||[]);},{reload:false}),
    ...(item.status==='archived'?[]:[
     rowAction('Replace',()=>resourceForm(item)),
     rowAction('Archive',()=>put('resources','archive',{id:item.id},'Archive this resource?','The file remains in storage and is hidden from the student library.')),
    ]),
   ));
   return [label,[item.course,item.lectureId,item.topic].filter(Boolean).join(' / '),bytes(item.bytes||item.size),formatDate(item.uploadedAt||item.createdAt||item.created_at),item.status||item.visibility,menu];
  }),'No shared resources match these filters.'));
  appendPager(page,(page+1)*25<data.total,n=>within(()=>resources(params,n,version)));
 }
 async function showDetails(title,data){
  await openForm(title,[node('pre',JSON.stringify(data,null,2),{class:'acc-data'})],'Done',()=>true);
 }
 async function analytics(version){
  const data=await request('analytics');
  if(version!==viewVersion)return;
  const s=data.summary;
  panel.append(cards([['Registered',s.registered],['Active in 7 days',s.active7],['Active in 30 days',s.active30],['Onboarded',s.onboarded],['Study analytics opt-ins',s.sharing],['Shared completed reviews',s.completedReviews??'Suppressed'],['Shared practice answers',s.answeredQuestions??'Suppressed']]),
   node('h4','Registrations'),table(['Day','Accounts'],data.registrations.map(x=>[x.day,x.count])),
   node('h4','Academic reports'),table(['Category','Reports'],data.problems.map(x=>[x.category,x.count])),
   node('h4','Shared resource downloads'),table(['Resource','Downloads in 30 days'],(data.popularity||[]).map(x=>[x.title,x.count])),
   node('h4','Operational activity'),table(['Day','Event','Count'],data.activity.map(x=>[x.day,x.kind,x.count])));
  const healthTitle=node('h4','System health · read-only');
  const healthStatus=node('p','On-demand probes; not a hosted restore or latency test.',{role:'status'});
  const healthDetails=node('div');
  const check=button('Run system health checks',async()=>{
   check.disabled=true;healthStatus.textContent='Checking D1, R2 and recent error counters…';healthDetails.replaceChildren();
   try{
    const result=await request('analytics/health');
    if(version!==viewVersion)return;
    healthDetails.append(cards([['Checked',formatDate(result.checkedAt)],['Environment',result.environment],['D1',result.database],['R2',result.storage],['Clerk',result.clerkSession]]));
    healthDetails.append(node('h4','Reported errors · last 7 days'),result.errorCounters===null?node('p','Error counter query unavailable.'):table(['Day','Category','Count'],result.errorCounters.map(x=>[x.day,x.kind,x.count]),'No reported error events in the last 7 days.'));
    healthDetails.append(node('p','CPU: '+result.cpu+' · '+result.limits,{class:'acc-empty'}));
    healthStatus.textContent=result.database==='reachable'&&result.storage==='reachable'?'Connectivity probes succeeded. This does not prove full service health.':'At least one read-only probe failed or was unavailable.';
   }catch(error){if(version===viewVersion)healthStatus.textContent=error.message||'Could not check health.'}
   finally{check.disabled=false}
  });
  panel.append(healthTitle,check,healthStatus,healthDetails);
 }
 async function audit(page=0,version=viewVersion,params=new URLSearchParams()){
  const base=Object.fromEntries(params);
  const data=await request('audit'+query({...base,page}));
  if(version!==viewVersion)return;
  const tableOf=rows=>table(['When','Role','Action','Actor','Target'],rows.map(x=>[formatDate(x.created_at),x.role,x.action,x.actor.split(':').at(-1),x.target.replace(/^clerk:[a-f0-9]{64}:/,'')]));
  panel.replaceChildren(searchBar([
   field('q','Search actor, action or target',{value:params.get('q'),maxLength:100}),
   field('role','Role',{choices:[['','All roles'],'owner','editor','moderator'],value:params.get('role')}),
   field('action','Action prefix',{value:params.get('action'),maxLength:80}),
   field('from','From (UTC)',{type:'date',value:params.get('from')}),
   field('to','To (UTC)',{type:'date',value:params.get('to')}),
  ],p=>within(()=>audit(0,version,p))));
  const exportButton=button('Export filtered audit CSV',async()=>{
   exportButton.disabled=true;
   status.textContent='Collecting filtered audit records…';
   try{
    const rows=[];let next=0,more=true;
    while(more&&rows.length<=2000){
     const result=await request('audit'+query({...base,page:next}));
     rows.push(...result.entries);more=result.more;next++;
     if(next>80||more&&rows.length>=2000)throw Error('Too many audit events to export at once. Narrow the date or action filters.');
    }
    if(version!==viewVersion)return;
    const headers=['id','created_at','role','action','actor','target'];
    const csv=csvRows(rows,headers);
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download='review-studio-audit-'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent=rows.length+' filtered records exported · last 90 days maximum.';
   }catch(error){status.textContent=error.message}
   finally{exportButton.disabled=false}
  });
  panel.append(rowAction('Verify owner access',confirmOwner,{reload:false}),exportButton);
  if(window.Clerk?.openUserProfile)panel.append(button('Manage Clerk account security',()=>{dialog.close();document.getElementById('siteAdmin')?.close();window.Clerk.openUserProfile();}));
  panel.append(tableOf(data.entries));
  appendPager(page,data.more,n=>within(()=>audit(n,version,params)));
 }
 async function site(version){
  const [data, info]=await Promise.all([request('site'),fetch('/site-build-info.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}))]);
  if(version!==viewVersion)return;
  const form=node('form',null,{class:'acc-editor'});
  for(const [key,label] of Object.entries(publicFlags))form.append(field(key,label,{type:'checkbox',value:data.flags[key]}));
  form.append(field('maintenance','Maintenance announcement',{type:'textarea',value:data.flags.maintenance,maxLength:300}));
  // Course end dates: after this day a course gets no scheduled reviews. Blank = use the last final/OSPE/practical on the calendar.
  const ends=globalThis.reviewCourseEndInfo?.()||{courses:[],detected:{}};
  if(ends.courses.length){
   const box=node('fieldset',null,{class:'acc-course-ends'});
   box.append(node('legend','Course end dates'),node('p','Reviews stop being scheduled after this date. Leave blank to use the last final, OSPE or practical on the calendar.',{class:'acc-empty'}));
   for(const course of ends.courses){
    const input=field('courseEnd:'+course,course+(ends.detected[course]?' (calendar: '+ends.detected[course]+')':' (no final on the calendar)'),{type:'date',value:data.flags.courseEnds?.[course]||''});
    box.append(input);
   }
   form.append(box);
  }
  form.append(node('button','Save site controls',{type:'submit',class:'primary'}));
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   const values=formValues(form);
   if(ends.courses.length){
    values.courseEnds={...(data.flags.courseEnds||{})};
    for(const key of Object.keys(values).filter(k=>k.startsWith('courseEnd:'))){values.courseEnds[key.slice(10)]=values[key];delete values[key];}
   }
   if(!await confirm('Apply site controls?','These controls take effect across this environment.'))return;
   event.submitter.disabled=true;
   try{if(await mutation('site/save',values)){status.textContent='Site controls saved.';window.dispatchEvent(new Event('review-managed-controls-refresh'));}}
   catch(error){status.textContent=error.message;}
   finally{event.submitter.disabled=false;}
  });
  const localChangeLog=field('lectureChangeLog','Lecture change log',{type:'checkbox',value:document.getElementById('adminLectureChanges')?.checked!==false});
  localChangeLog.addEventListener('change',event=>{
   const existing=document.getElementById('adminLectureChanges');
   if(existing){existing.checked=event.target.checked;existing.dispatchEvent(new Event('change'));}
  });
  panel.append(cards([['Environment',data.environment],['Deployed version',info.displayVersion],['Database binding',data.database?'Available':'Unavailable'],['Storage binding',data.storage?'Available':'Unavailable']]),form,localChangeLog,
   node('h4','Recent source revisions'),table(['Commit','Date'],(info.releases||[]).map(r=>[r.commit,formatDate(r.date)]),'Release history is unavailable for this build.'));
 }
 async function storage(version){
  const data=await request('storage/summary');
  if(version!==viewVersion)return;
  const details=node('div');renderMetrics(details,data);
  panel.append(details);
 }
 async function overview(version){
  const data=await request('overview');
  if(version!==viewVersion)return;
  const info=data.summary;
  panel.append(cards([['Environment',data.environment],['Access',({owner:'Owner',editor:'Content Editor',moderator:'Moderator'})[data.role]],...(info?[['Registered accounts',info.registered],['Active in 7 days',info.active7],['Onboarded',info.onboarded]]:[])]));
  if(data.flags.maintenance)panel.append(node('p',data.flags.maintenance,{class:'acc-empty'}));
  const tiles=node('div',null,{class:'acc-tiles'});
  for(const section of access.sections.filter(section=>section!=='overview')){
   const tile=button('',()=>load(section),'acc-tile');
   const text=node('span');text.append(node('strong',tabs[section]),node('small',sectionHints[section]||''));
   tile.append(sectionIcon(section),text);tiles.append(tile);
  }
  panel.append(tiles);
 }
 async function within(work){
  status.textContent='Loading…';
  try{await work();status.textContent='';}
  catch(error){status.textContent=error.message;}
 }
 const views={overview, students:v=>students(false,new URLSearchParams(),0,v),roles:v=>students(true,new URLSearchParams(),0,v),
  academics,resources:v=>resources(new URLSearchParams(),0,v),reports:v=>reports(v),announcements:v=>announcements(v),
  analytics,storage,audit:v=>audit(0,v),site};
 async function load(section){
  selected=section;const version=++viewVersion;
  heading.textContent=tabs[section];panel.replaceChildren();status.textContent='Loading…';
  for(const [key,tab] of nav){if(key===section)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');}
  try{await views[section](version);if(version===viewVersion)status.textContent='';}
  catch(error){if(version===viewVersion){status.textContent=error.message;panel.append(button('Retry',()=>load(section)));}}
 }
 for(const [label,...members] of sectionGroups){
  const allowed=members.filter(section=>access.sections.includes(section));if(!allowed.length)continue;
  if(label)navigation.append(node('p',label,{class:'acc-nav-group'}));
  for(const section of allowed){const element=button(tabs[section],()=>load(section));element.prepend(sectionIcon(section));nav.set(section,element);navigation.append(element);}
 }
 for(const section of access.sections.filter(section=>!nav.has(section))){const element=button(tabs[section],()=>load(section));element.prepend(sectionIcon(section));nav.set(section,element);navigation.append(element);}
 await load('overview');

 // Content controls share the same confirmation and server-side challenge flow.
 async function reports(version, params=new URLSearchParams(), page=0){
  const data=await request('reports/list'+query({...Object.fromEntries(params),page,limit:25,offset:page*25}));
  if(version!==viewVersion)return;
  panel.replaceChildren(searchBar([
   field('q','Question ID or report details',{value:params.get('q')}),
   field('status','Status',{choices:[['','All'],'open','investigating','resolved','rejected'],value:params.get('status')}),
   field('category','Category (exact)',{value:params.get('category'),maxLength:60}),
  ],p=>within(()=>reports(version,p,0))),
  table(['Question','Category','Status','Reported','Actions'],(data.reports||[]).map(report=>{
   const id=report.id;
   const controls=[rowAction('Inspect',()=>showDetails('Question report',report),{reload:false})];
   if(access.role!=='editor')controls.push(rowAction('Update status',()=>openForm('Moderate report',[
    field('status','Status',{choices:['open','investigating','resolved','rejected'],value:report.status}),
    field('note','Review note',{type:'textarea',maxLength:1200}),
   ],'Save status',values=>mutation('reports/update',{reportId:id,...values}))));
   if(access.role!=='moderator'&&report.category!=='technical')controls.push(rowAction('Propose correction',()=>openForm('Propose correction',[
    field('question','Proposed question wording',{type:'textarea',maxLength:2000}),
    field('explanation','Corrected explanation',{type:'textarea',maxLength:3000}),
    field('answer','Proposed answer option (requires reviewed release)',{choices:[['','Keep answer'],['0','A'],['1','B'],['2','C'],['3','D'],['4','E']]}),
    field('source','Verified source and page',{required:true,maxLength:400}),
   ],'Submit proposal',values=>{
    const patch=Object.fromEntries(Object.entries({question:values.question,explanation:values.explanation}).filter(([,value])=>value.trim()));
    if(values.answer!=='')patch.answer=Number(values.answer);
    return mutation('reports/propose',{reportId:id,patch,source:values.source});
   })));
   if(access.role==='owner'&&report.revisionStatus==='proposed')controls.push(
    rowAction('Approve',()=>put('reports','approve',{reportId:id},'Publish this correction?','Review the proposal and source before approving.')),
    rowAction('Reject',()=>put('reports','reject',{reportId:id},'Reject this proposal?','The original question remains available for study.')),
   );
   const menu=node('details');menu.append(node('summary','Review'),actions(...controls));
   return [report.questionId||report.question_id,report.category||report.kind,report.status,formatDate(report.createdAt||report.created_at),menu];
  }),'No question reports match these filters.'));
  const exportCsv=button('Export filtered reports CSV',async()=>{
   exportCsv.disabled=true;status.textContent='Collecting report triage rows…';
   try{
    let pageNumber=0,more=true;const rows=[];
    while(more&&rows.length<=2000){
     const result=await request('reports/list'+query({...Object.fromEntries(params),page:pageNumber,limit:100}));
     rows.push(...result.reports);more=result.hasMore;pageNumber++;
     if(rows.length>2000||more&&rows.length>=2000||pageNumber>20)throw Error('Too many reports to export. Narrow the filters before exporting.');
    }
    if(version!==viewVersion)return;
    const headers=['id','questionId','category','kind','status','details','createdAt','updatedAt','reviewNote','revisionStatus'];
    const csv=csvRows(rows,headers);
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='review-studio-reports-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent=rows.length+' reports exported. Reporter identities excluded.';
   }catch(error){status.textContent=error.message}
   finally{exportCsv.disabled=false}
  });
  panel.append(exportCsv);
  appendPager(page,data.more||data.hasMore||((page+1)*25<(data.total||0)),n=>within(()=>reports(version,params,n)));
 }
 function announcementData(item) {
  return {id:item.id,title:item.title,body:item.body,audience:item.audience,targetClass:item.target_class,
   targetSection:item.target_section,targetLab:item.target_lab,priority:item.priority,startsAt:item.starts_at,expiresAt:item.expires_at};
 }
 function announcementForm(item){
  const data=item?announcementData(item):{};
  const published=item?.status==='published';
  return openForm(item?'Edit announcement':'New announcement',[
   field('title','Title',{value:data.title,required:true,maxLength:140}),
   field('body','Message',{value:data.body,type:'textarea',required:true,maxLength:3000}),
   field('audience','Audience',{choices:['global','class','group','lab'],value:data.audience||'global'}),
   field('targetClass','Class',{choices:[['','Select if applicable'],...classes],value:data.targetClass}),
   field('targetSection','Section',{choices:[['','Select if applicable'],'A','B'],value:data.targetSection}),
   field('targetLab','Lab group',{value:data.targetLab,maxLength:30}),
   field('priority','Priority',{choices:['normal','important','urgent'],value:data.priority||'normal'}),
   field('startsAt','Publish at (local time)',{type:'datetime-local',value:localTime(data.startsAt)}),
   field('expiresAt','Expires at (local time)',{type:'datetime-local',value:localTime(data.expiresAt)}),
  ],published?'Publish changes':'Save draft',async values=>{
   if(published&&!await confirm('Publish these changes?','The updated announcement will replace the published version.'))return null;
   return mutation(published?'announcements/publish':'announcements/save',{...values,id:data.id,startsAt:iso(values.startsAt),expiresAt:iso(values.expiresAt)});
  });
 }
 async function announcements(version,page=0){
  const data=await request('announcements/list'+query({page,limit:25,offset:page*25}));
  if(version!==viewVersion)return;
  panel.replaceChildren(rowAction('New announcement',()=>announcementForm()),table(['Announcement','Audience','Priority','Status','Actions'],(data.announcements||[]).map(item=>{
   const controls=actions(
    rowAction('Preview',()=>openForm('Announcement preview',[node('article',item.body,{class:'acc-data'}),node('p',item.audience+' · '+item.priority),node('p','Starts '+formatDate(item.starts_at)+(item.expires_at?' · Expires '+formatDate(item.expires_at):''))],'Done',()=>true),{reload:false}),
    rowAction('Edit',()=>announcementForm(item)),
    item.status!=='published'&&rowAction('Publish',()=>put('announcements','publish',announcementData(item),'Publish this announcement?','Students in the selected audience will see the announcement at its scheduled time.')),
    rowAction('Archive',()=>put('announcements','archive',{id:item.id},'Archive this announcement?','It will be hidden from the student dashboard.')),
   );
   return [item.title,[item.target_class,item.target_section,item.target_lab].filter(Boolean).join(' / ')||'Global',item.priority,item.status,controls];
  }),'No announcements yet.'));
  appendPager(page,data.more||data.hasMore||((page+1)*25<(data.total||0)),n=>within(()=>announcements(version,n)));
 }
}
function localTime(value){
 if(!value)return '';
 const date=new Date(value);
 return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function iso(value){return value?new Date(value).toISOString():null;}
function renderMetrics(container,data){
 for(const [key,value] of Object.entries(data)){
  const label=key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,first=>first.toUpperCase());
  const group=node('section',null,{class:'acc-card'});
  group.append(node('h4',label));
  if(value&&typeof value==='object'){
   group.append(table(['Measure','Value'],Object.entries(value).map(([k,v])=>[k,typeof v==='object'&&v!==null?JSON.stringify(v):typeof v==='number'&&/bytes/i.test(k)?bytes(v):v??'Unavailable'])));
  }else group.append(node('p',value??'Unavailable'));
  container.append(group);
 }
}
