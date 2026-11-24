// This form edits configuration only. Server ownership is checked independently of the UI lock.
const groupCodes=['M1','M2','F1','F2'],sectionCodes=['A','B'];
const validLab=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9. -]{0,29}$/.test(v)&&v===v.trim();
export function validateGroupRows(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>8)return false;
 const seen=new Set();
 for(const g of rows){
  if(!g||typeof g!=='object'||Array.isArray(g)||!groupCodes.includes(g.studentGroup)||!sectionCodes.includes(g.studentSection)||!Array.isArray(g.labGroups)||!g.labGroups.length||g.labGroups.length>100||!g.labGroups.every(validLab)||new Set(g.labGroups).size!==g.labGroups.length)return false;
  const key=g.studentGroup+'/'+g.studentSection;if(seen.has(key))return false;seen.add(key);
 }
 return true;
}
export function parseGroupText(value){
 if(typeof value!=='string'||value.length>100000)throw Error('Invalid group configuration.');
 const lines=value.split(/\r?\n/).filter(s=>s.trim()),rows=lines.map((line,i)=>{
  const parts=line.split(':');if(parts.length!==2)throw Error('Line '+(i+1)+': use class,section:lab groups.');
  const pair=parts[0].split(',').map(s=>s.trim()),labGroups=parts[1].split(',').map(s=>s.trim());
  if(pair.length!==2||!labGroups.every(validLab))throw Error('Line '+(i+1)+': invalid class, section or lab groups.');
  return {studentGroup:pair[0],studentSection:pair[1],labGroups};
 });
 if(!validateGroupRows(rows))throw Error('Use unique verified class/section pairs and nonempty, unique lab groups.');
 return rows;
}
export function formatGroupRows(rows){
 if(!validateGroupRows(rows))throw Error('Invalid group response. Your draft was retained.');
 return rows.map(g=>g.studentGroup+','+g.studentSection+':'+g.labGroups.join(',')).join('\n');
}
export function mountAcademicAdmin(){
 const host=document.getElementById('adminSettingsContent');if(!host||host.querySelector('[data-academic-admin]'))return;
 const section=document.createElement('section');section.className='panel';section.dataset.academicAdmin='';
 section.innerHTML='<details><summary>Academic lab groups</summary><p>Verified class/section lab lists. Other timetable days and times are not inferred.</p><label>One class/section per line: M1,A:1.6<textarea data-groups rows="5" spellcheck="false"></textarea></label><button type="button" data-load>Load verified groups</button><button type="button" data-save>Save groups</button><p role="status"></p></details>';
 host.append(section);const text=section.querySelector('textarea'),status=section.querySelector('[role=status]'),load=section.querySelector('[data-load]'),save=section.querySelector('[data-save]');let busy=false;
 async function request(method){
  if(busy)return;
  const draft=text.value;let groups;
  try{if(method==='PUT')groups=parseGroupText(draft)}catch(error){status.textContent=error.message;return}
  busy=true;load.disabled=save.disabled=true;status.textContent=method==='PUT'?'Saving…':'Loading…';
  try{
   const r=await fetch('/api/academic-config',{method,cache:'no-store',headers:{'Content-Type':'application/json'},...(groups?{body:JSON.stringify({groups})}:{})}),data=await r.json();
   if(!r.ok)throw Error(data.error||'Could not load groups.');
   const next=formatGroupRows(data.groups);
   if(text.value===draft){text.value=next;status.textContent=method==='PUT'?'Verified lab groups saved.':'Verified lab groups loaded.'}
   else status.textContent=method==='PUT'?'Submitted groups saved. Your newer edits remain unsaved.':'Groups loaded, but your newer draft was retained.';
  }catch(e){status.textContent=e.message==='Owner authorization required.'?'Server owner authorization is not configured or this account is not the owner. No changes saved.':e.message}
  finally{busy=false;load.disabled=save.disabled=false}
 }
 load.onclick=()=>request('GET');save.onclick=()=>request('PUT');
}
