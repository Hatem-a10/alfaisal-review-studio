/* global applyTheme, persist, settings, render, view, storeOptions, DATA, LEARNING, uploads, inlineTopicsFor, lessonById, allLearningQuestions, TOPIC_CHECKS, inlineGroups, chooseLesson, go, libraryDocumentURL, sourceById */
import {deriveAccent} from './phase1-accent.mjs';
import {ASSESSMENT_GRADIENTS,gradientById,chosenGradient,mountGradientPicker} from './accent-gradients.mjs';
import {declutter} from './phase1-copy.mjs';
import {mountAcademicAdmin} from './phase1-academic-admin.mjs';
import {installSearch} from './phase1-search.mjs';
import {preloadCriticalModules} from './phase1-critical-preloads.mjs';
import {installAdaptivePrefetch} from './adaptive-prefetch.mjs';
preloadCriticalModules(document,import.meta.url,navigator.connection);
installAdaptivePrefetch(document,navigator,import.meta.url);
await Promise.all([import("./reading-tools.js?v=1497"),import("./lecture-updates.js?v=1498")]);
await import("./mobile-dock.js?v=1498");
await import("./studio-navigation.js?v=1503");
let solver,solverRetries=0;
const assessmentPalettes=ASSESSMENT_GRADIENTS.map(gradientById);
export const STAIN_ACCENTS=assessmentPalettes.map(p=>p.b);
const DEFAULT_ACCENTS=/^#(?:5b4bd0|2f6c52)$/i;
let bootGradient='';
function themes(){
 const old=applyTheme;
 let lastColor,lastDark,paletteEntries;
 const isAuto=()=>typeof settings.accentAuto==='boolean'?settings.accentAuto:!(/^#[0-9a-f]{6}$/i.test(settings.accent||'')&&!DEFAULT_ACCENTS.test(settings.accent));
 const paletteFor=index=>{
  const category=assessmentPalettes[index]||assessmentPalettes[0];
  const manual=isAuto()?null:chosenGradient({...settings,accentAuto:false});
  return manual?{a:manual.a,b:category.b,c:'color-mix(in srgb,'+category.c+' 70%,'+manual.c+')'}:category;
 };
 window.reviewGradientStyleFor=index=>Object.entries(paletteFor(index)).filter(([key])=>['a','b','c'].includes(key)).map(([key,value])=>'--st-'+key+':'+value).join(';');
 applyTheme=function(...args){
  const result=old.apply(this,args),root=document.documentElement,stain=Number(window.reviewNextStain?.()??0)%8,auto=isAuto();
  const palette=auto?assessmentPalettes[stain]:chosenGradient({...settings,accentAuto:false}),dark=settings.theme==='amoled';
  const accentMode=auto?'auto':'palette',stainValue=String(stain);
  if(root.dataset.stain!==stainValue)root.dataset.stain=stainValue;
  if(root.dataset.accent!==accentMode)root.dataset.accent=accentMode;
  for(const key of ['a','b','c'])if(root.style.getPropertyValue('--pal-'+key)!==palette[key])root.style.setProperty('--pal-'+key,palette[key]);
  if(!paletteEntries||palette.b!==lastColor||dark!==lastDark){paletteEntries=Object.entries(deriveAccent(palette.b,dark));lastColor=palette.b;lastDark=dark}
  for(const [key,value] of paletteEntries)if(root.style.getPropertyValue(key)!==value||root.style.getPropertyPriority(key))root.style.setProperty(key,value);
  const value=JSON.stringify({stops:[palette.a,palette.b,palette.c],dark});
  if(value!==bootGradient){bootGradient=value;try{localStorage.setItem('review-studio-boot-gradient',value)}catch{}}
  return result;
 };
 applyTheme();
}
async function readingData({enrich=false}={}){
 const archived=item=>window.reviewArchivedStudyItem?.(item)===true||window.REVIEW_STUDIO_FRESH_ACCOUNTS===true&&window.reviewViewingArchive?.()!==true&&item?.course==='CVP';
 // Course content loads on demand; search and reading need every active (non-archived) course.
 if(enrich)await window.reviewEnsureCourses?.(Object.keys(globalThis.REVIEW_COURSE_PACKS||{}).filter(course=>!archived({course})));
 if(enrich)await Promise.allSettled([window.ensureObjectivePack?.(),...(!archived({course:'CVP'})?[window.loadCvp19?.(),window.Cvp19?.ensure()]:[])]);
 const archivedRefs=new Set(LEARNING.lessons.filter(archived).flatMap(l=>[
  ...(l.references||[]),...(l.facts||[]).flatMap(f=>f.references||[]),
 ]).map(ref=>ref.source));
 const lessonVisible=id=>window.reviewLessonVisible?.(id)!==false;
 const lessons=LEARNING.lessons.filter(l=>!archived(l)&&lessonVisible(l.id));
 const questionLecture=q=>[q.lessonId,q.lectureId,...(q.lectureIds||[])].find(id=>id&&lessonVisible(id));
 return {
  lectures:DATA.items.filter(x=>!archived(x)&&lessonVisible(x.id)).map(x=>({id:x.id,lecture:x.id,title:x.title||x.name||x.id,context:x.id})),
  objectives:lessons.flatMap(l=>inlineTopicsFor(l).map((t,i)=>({id:l.id+':'+i,lecture:l.id,topic:i,title:t.title||t.concept||'Objective',context:l.id}))),
  questions:allLearningQuestions().concat(Object.values(TOPIC_CHECKS).flat()).filter(q=>!archived(q)&&(!q.lessonId&&!q.lectureId&&!q.lectureIds?.length||questionLecture(q))).map(q=>({id:q.id,lecture:questionLecture(q),title:q.stem||q.question||q.prompt,context:questionLecture(q)||''})),
  materials:LEARNING.sources.concat(uploads).filter(s=>!archived(s)&&!archivedRefs.has(s.id)&&libraryDocumentURL(s)).map(s=>({id:s.id,title:s.displayName||s.name,context:'Material library',course:s.course||String(s.lectureId||s.lectureIds?.[0]||'').split('-')[0]})),
 };
}
function jump(item){if(window.reviewArchivedStudyItem?.({...item,lectureId:item.lecture}))return;if(item.kind==='material'){go('library');const url=libraryDocumentURL(sourceById(item.id));if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.click()}return}let id=item.lecture,topic=item.topic,index=-1;if(item.kind==='question'){for(const lesson of LEARNING.lessons){if(window.reviewLessonVisible?.(lesson.id)===false)continue;const groups=inlineGroups(lesson).groups;const found=groups.findIndex(group=>group.some(q=>q.id===item.id));if(found>=0){id=lesson.id;topic=found;index=groups[found].findIndex(q=>q.id===item.id);break}}}if(!lessonById(id)||window.reviewLessonVisible?.(id)===false)return;chooseLesson(id);if(Number.isInteger(topic)){guideTopic=cardIndex=topic;guideTopicLesson=id;learnTab='lesson';render()}requestAnimationFrame(()=>{const target=index>=0?document.getElementById('inline-question-'+index):document.querySelector('.guide-section,.complete-guide,.teaching-card,#inlineTopicQuestions');target?.scrollIntoView({block:'start',behavior:'instant'})})}
function enhance(){declutter(document);mountAcademicAdmin();if(view==='grades'){solver??=solverRetries?import('./grade-solver.mjs?retry='+solverRetries):import('./grade-solver.mjs');const pending=solver;pending.then(m=>{if(view==='grades')m.mountGradeSolver(document.getElementById('content'),()=>storeOptions().grades||[])}).catch(()=>{if(solver===pending){solver=null;solverRetries++}globalThis.reviewAutoRetry?.schedule('grade-solver',()=>{if(view==='grades')enhance()})})}}
themes();const old=render;render=function(...args){const result=old.apply(this,args);enhance();return result};
installSearch({read:readingData,open:jump,blocked:()=>!!document.querySelector('#xpExam')});
// Wizard is mounted asynchronously outside the content tree.
const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.student-welcome')||n.querySelector?.('.student-welcome')))))declutter(document)});observer.observe(document.body,{childList:true,subtree:true});
enhance();

await import('./phase2-runtime.mjs?v=1499');

await import("./phase3-runtime.mjs?v=2");
await import("./course-workspace.mjs");
/* Settings → Appearance: a gradient picker replaces the free colour input and the separate
   Auto accent checkbox. The old controls stay in the DOM, hidden, so existing handlers and
   saved settings keep working. */
export function installAccentPicker(doc=document){
 const host=doc.querySelector('.hub-accent-control');if(!host||host.querySelector('.gradient-picker'))return;
 const input=doc.getElementById('accentColor'),autoBox=doc.getElementById('accentAuto');
 // The colour input sat inside this <label>, so any click on the picker also opened the
 // browser's colour picker. Move it out of the label (it stays hidden for older handlers).
 if(input){input.hidden=true;input.style.display='none';host.closest('.hub-appearance')?.append(input)}
 const autoLabel=autoBox?.closest('label');if(autoLabel){autoLabel.hidden=true;autoLabel.style.display='none'}
 const title=host.querySelector(':scope>span');if(title)title.textContent='Accent gradient';
 const current=()=>settings.accentAuto!==false?'auto':chosenGradient(settings)?.id;
 const picker=mountGradientPicker(host,{selected:current(),onPick(g){
  if(g){settings.accentAuto=false;settings.accentPalette=g.id;settings.accent=g.b;if(input)input.value=g.b}else settings.accentAuto=true;
  if(autoBox)autoBox.checked=!g;persist();applyTheme();
 }});
 window.addEventListener('review-profile-changed',()=>picker.select(current()));
}
if(typeof document!=='undefined'&&typeof settings!=='undefined')installAccentPicker();
