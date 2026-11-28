'use strict';
const scheduleDefaultColors={anatomy:'#64b99c',physiology:'#79a7e6',mol:'#ac8cdb',lab:'#55b8c6',assessment:'#e39c76',break:'#aabac5',other:'#94a8b5',english:'#dcaf51'};
let renamingSetId=null,paletteEditorOpen=false,paletteSaving=false;
const validScheduleColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const siteScheduleColor=kind=>window.reviewManagedFlags?.scheduleColors?.[kind];
function effectiveScheduleColor(kind){
 return [settings.calendarColors?.[kind],siteScheduleColor(kind),scheduleDefaultColors[kind]].find(validScheduleColor);
}
async function setScheduleDefaults(){
 if(window.reviewAdmin!==true||paletteSaving)return;
 paletteSaving=true;
 const button=$('#setScheduleDefaultColors');
 if(button)button.disabled=true;
 try{
  const colors=Object.fromEntries(Object.keys(scheduleDefaultColors).map(kind=>[kind,effectiveScheduleColor(kind)]));
  const saved=await (await import('/admin-control-center.mjs?v=18')).saveScheduleDefaultColors(colors);
  if(!saved)return;
  window.reviewManagedFlags={...window.reviewManagedFlags,scheduleColors:saved.colors};
  paletteEditorOpen=true;
  render();
  window.dispatchEvent(new Event('review-managed-controls-refresh'));
  toast('Site-wide default schedule colors saved');
 }catch(error){toast(error.message)}
 finally{
  paletteSaving=false;
  const current=$('#setScheduleDefaultColors');
  if(current)current.disabled=false;
 }
}
window.addEventListener('review-admin-role',()=>{
 const button=$('#setScheduleDefaultColors');
 if(button)button.hidden=window.reviewAdmin!==true||!window.REVIEW_STUDIO_FRESH_ACCOUNTS;
});
function saveExamDisplayName(id,name){if(window.reviewAdmin!==true)throw Error('Admin access is required to rename assessments.');if(!ORIGINAL_EXAMS.sets.some(s=>s.id===id))throw Error('This set is unavailable.');const text=String(name||'').trim();if(text.length>100)throw Error('Use a name of 100 characters or fewer.');const names={...(settings.examNames||{})};if(text)names[id]=text;else delete names[id];settings.examNames=names;persist()}
function openRenameSet(id){if(window.reviewAdmin!==true)return;const set=ORIGINAL_EXAMS.sets.find(s=>s.id===id);if(!set)return;renamingSetId=id;$('#renameSetOriginal').textContent='Original source: '+set.title;$('#renameSetName').value=examSetTitle(set);$('#renameSetDialog').showModal()}
function calendarPaletteEditor(){return `<details class="calendar-palette" id="calendarPaletteEditor" ${paletteEditorOpen?'open':''}><summary>Customize legend colors</summary><div class="palette-controls">${Object.keys(scheduleDefaultColors).map(k=>`<label><span>${campusCategoryLabel(k)}</span><input type="color" data-campus-color="${k}" aria-label="${campusCategoryLabel(k)} schedule color" value="${effectiveScheduleColor(k)}"></label>`).join('')}</div><button type="button" id="resetCalendarColors">Restore default colors</button> <button type="button" id="setScheduleDefaultColors" ${window.reviewAdmin===true&&window.REVIEW_STUDIO_FRESH_ACCOUNTS?'':'hidden'} ${paletteSaving?'disabled':''}>Set Default Colors</button><p class="section-sub">Colors apply to the timetable, daily agenda and legend. Your choices save with your progress.</p></details>`}
function mixScheduleColor(hex,base,amount){const a=hex.slice(1).match(/../g).map(v=>parseInt(v,16)),b=base.slice(1).match(/../g).map(v=>parseInt(v,16));return '#'+a.map((v,i)=>Math.round(v*amount+b[i]*(1-amount)).toString(16).padStart(2,'0')).join('')}
function colorLuminance(hex){const v=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]}
function scheduleColorScheme(hex,dark){const background=mixScheduleColor(hex,dark?'#111519':'#ffffff',dark?.28:.23);let foreground=mixScheduleColor(hex,dark?'#ffffff':'#112536',dark?.35:.55);const a=colorLuminance(background),b=colorLuminance(foreground);if((Math.max(a,b)+.05)/(Math.min(a,b)+.05)<4.5)foreground=dark?'#f4f7f9':'#173042';return {background,foreground}}
function paintScheduleColors(){const dark=settings.theme==='amoled',rules=[];
 for(const kind of Object.keys(scheduleDefaultColors)){
  const hex=effectiveScheduleColor(kind);
  const kinds=kind==='lab'?['lab','shared']:[kind];
  for(const cls of kinds)rules.push(`.schedule-page .campus-${cls}{--session-accent:${hex}}`);
 }
 for(const kind of Object.keys(scheduleDefaultColors)){if(!validScheduleColor(settings.calendarColors?.[kind])&&!validScheduleColor(siteScheduleColor(kind)))continue;const hex=effectiveScheduleColor(kind);const {background,foreground}=scheduleColorScheme(hex,dark),classes=kind==='lab'?['lab','shared']:[kind];for(const cls of classes)rules.push(`html[data-theme] .campus-${cls}{background:${background};color:${foreground}}html[data-theme] .schedule-legend i.campus-${cls},html[data-theme] .agenda-dot.campus-${cls}{background:${hex}}`)}$('#scheduleCustomColors').textContent=rules.join('\n')}
const renderBeforePersonalization=render;render=function(){renderBeforePersonalization();paintScheduleColors()};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.renameSet)openRenameSet(b.dataset.renameSet);if(b.id==='closeRenameSet')$('#renameSetDialog').close();if(b.id==='resetSetName'&&renamingSetId&&window.reviewAdmin===true){saveExamDisplayName(renamingSetId,'');$('#renameSetDialog').close();render();toast('Original name restored')}if(b.id==='setScheduleDefaultColors')setScheduleDefaults();if(b.id==='resetCalendarColors'){settings.calendarColors={};paletteEditorOpen=$('#calendarPaletteEditor').open;persist();render();toast('Default schedule colors restored')}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.campusColor&&Object.hasOwn(scheduleDefaultColors,t.dataset.campusColor)&&/^#[0-9a-f]{6}$/i.test(t.value)){settings.calendarColors={...(settings.calendarColors||{}),[t.dataset.campusColor]:t.value};paletteEditorOpen=$('#calendarPaletteEditor').open;persist();render()}if(t.id==='scheduleEnglish'){settings.englishEnabled=t.checked;persist();render();toast(t.checked?'English shown · Monday and Wednesday, 5:30–7:00 pm':'English hidden from schedule and study planning')}});
document.addEventListener('toggle',e=>{if(e.target.id==='calendarPaletteEditor')paletteEditorOpen=e.target.open},true);
$('#renameSetForm').onsubmit=e=>{e.preventDefault();try{saveExamDisplayName(renamingSetId,$('#renameSetName').value);$('#renameSetDialog').close();render();toast('Set name saved')}catch(err){toast(err.message)}};
