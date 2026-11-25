/* global applyTheme, persist, settings, render, view, storeOptions, DATA, LEARNING, uploads, inlineTopicsFor, lessonById, allLearningQuestions, TOPIC_CHECKS, inlineGroups, chooseLesson, go, libraryDocumentURL, sourceById */
import {deriveAccent} from './phase1-accent.mjs';
import {chosenGradient,mountGradientPicker} from './accent-gradients.mjs';
import {declutter} from './phase1-copy.mjs';
import {mountAcademicAdmin} from './phase1-academic-admin.mjs';
import {installSearch} from './phase1-search.mjs';
import {preloadCriticalModules} from './phase1-critical-preloads.mjs';
import {installAdaptivePrefetch} from './adaptive-prefetch.mjs';
preloadCriticalModules(document,import.meta.url,navigator.connection);
installAdaptivePrefetch(document,navigator,import.meta.url);
await Promise.all([import("./reading-tools.js?v=1497"),import("./lecture-updates.js?v=1498")]);
await import("./mobile-dock.js?v=1498");
await import("./studio-navigation.js?v=1498");
let solver,solverRetries=0;
// Mid tones of the eight stain palettes in redesign.css (--st-b), in the same order.
export const STAIN_ACCENTS=['#3a2f86','#245796','#8e2a6c','#226a8f','#5c4428','#246b52','#4d3a99','#93302d'];
const DEFAULT_ACCENTS=/^#(?:5b4bd0|2f6c52)$/i;
function themes(){const old=applyTheme;let lastColor,lastDark,paletteEntries;applyTheme=function(...args){const result=old.apply(this,args),root=document.documentElement,stain=Number(window.reviewNextStain?.()??0)%8,auto=typeof settings.accentAuto==='boolean'?settings.accentAuto:!(/^#[0-9a-f]{6}$/i.test(settings.accent||'')&&!DEFAULT_ACCENTS.test(settings.accent)),palette=auto?null:chosenGradient({...settings,accentAuto:false}),color=palette?palette.b:STAIN_ACCENTS[stain],dark=settings.theme==='amoled',stainValue=String(stain),accentValue=palette?'palette':'auto';if(root.dataset.stain!==stainValue)root.dataset.stain=stainValue;if(root.dataset.accent!==accentValue)root.dataset.accent=accentValue;for(const [key,value] of [['--pal-a',palette?.a],['--pal-b',palette?.b],['--pal-c',palette?.c]]){if(value){if(root.style.getPropertyValue?.(key)!==value)root.style.setProperty?.(key,value)}else root.style.removeProperty?.(key)};if(!paletteEntries||color!==lastColor||dark!==lastDark){paletteEntries=Object.entries(deriveAccent(color,dark));lastColor=color;lastDark=dark}for(const[key,value]of paletteEntries)if(root.style.getPropertyValue?.(key)!==value||root.style.getPropertyPriority?.(key))root.style.setProperty(key,value);rememberBootGradient(palette,stain,dark);return result};applyTheme()}
// The loading spinner runs before any stylesheet or module, so keep the gradient in use (stops, theme) for it.
const STAIN_STOPS=[['#221b57','#3a2f86','#d9547f'],['#0f2547','#245796','#c2414f'],['#3d0f33','#8e2a6c','#db66ad'],['#0d2a44','#226a8f','#9a6ad6'],['#241a10','#5c4428','#b8872b'],['#0d2e25','#246b52','#3e9f63'],['#1d1a52','#4d3a99','#db66a9'],['#3b0f18','#93302d','#ec6817']];
let bootGradient='';function rememberBootGradient(palette,stain,dark){const stops=palette?[palette.a,palette.b,palette.c]:STAIN_STOPS[stain]||STAIN_STOPS[0],value=JSON.stringify({stops,dark});if(value===bootGradient)return;bootGradient=value;try{localStorage.setItem('review-studio-boot-gradient',value)}catch{}}
async function readingData({enrich=false}={}){
 const archived=item=>window.reviewArchivedStudyItem?.(item)===true||window.REVIEW_STUDIO_FRESH_ACCOUNTS===true&&window.reviewViewingArchive?.()!==true&&item?.course==='CVP';
 // Course content loads on demand; search and reading need every active (non-archived) course.
 if(enrich)await window.reviewEnsureCourses?.(Object.keys(globalThis.REVIEW_COURSE_PACKS||{}).filter(course=>!archived({course})));
 if(enrich)await Promise.allSettled([window.ensureObjectivePack?.(),...(!archived({course:'CVP'})?[window.loadCvp19?.(),window.Cvp19?.ensure()]:[])]);
 const archivedRefs=new Set(LEARNING.lessons.filter(archived).flatMap(l=>[
  ...(l.references||[]),...(l.facts||[]).flatMap(f=>f.references||[]),
 ]).map(ref=>ref.source));
 const lessons=LEARNING.lessons.filter(l=>!archived(l));
 return {
  lectures:DATA.items.filter(x=>!archived(x)).map(x=>({id:x.id,lecture:x.id,title:x.title||x.name||x.id,context:x.id})),
  objectives:lessons.flatMap(l=>inlineTopicsFor(l).map((t,i)=>({id:l.id+':'+i,lecture:l.id,topic:i,title:t.title||t.concept||'Objective',context:l.id}))),
  questions:allLearningQuestions().concat(Object.values(TOPIC_CHECKS).flat()).filter(q=>!archived(q)).map(q=>({id:q.id,lecture:q.lessonId||q.lectureId||q.lectureIds?.[0],title:q.stem||q.question||q.prompt,context:q.lessonId||q.lectureId||q.lectureIds?.[0]||''})),
  materials:LEARNING.sources.concat(uploads).filter(s=>!archived(s)&&!archivedRefs.has(s.id)&&libraryDocumentURL(s)).map(s=>({id:s.id,title:s.displayName||s.name,context:'Material library'})),
 };
}
function jump(item){if(window.reviewArchivedStudyItem?.({...item,lectureId:item.lecture}))return;if(item.kind==='material'){go('library');const url=libraryDocumentURL(sourceById(item.id));if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.click()}return}let id=item.lecture,topic=item.topic,index=-1;if(item.kind==='question'){for(const lesson of LEARNING.lessons){const groups=inlineGroups(lesson).groups;const found=groups.findIndex(group=>group.some(q=>q.id===item.id));if(found>=0){id=lesson.id;topic=found;index=groups[found].findIndex(q=>q.id===item.id);break}}}if(!lessonById(id))return;chooseLesson(id);if(Number.isInteger(topic)){guideTopic=cardIndex=topic;guideTopicLesson=id;learnTab='lesson';render()}requestAnimationFrame(()=>{const target=index>=0?document.getElementById('inline-question-'+index):document.querySelector('.guide-section,.complete-guide,.teaching-card,#inlineTopicQuestions');target?.scrollIntoView({block:'start',behavior:'instant'})})}
function enhance(){declutter(document);mountAcademicAdmin();if(view==='grades'){solver??=solverRetries?import('./grade-solver.mjs?retry='+solverRetries):import('./grade-solver.mjs');const pending=solver;pending.then(m=>{if(view==='grades')m.mountGradeSolver(document.getElementById('content'),()=>storeOptions().grades||[])}).catch(()=>{if(solver===pending){solver=null;solverRetries++}globalThis.reviewAutoRetry?.schedule('grade-solver',()=>{if(view==='grades')enhance()})})}}
themes();const old=render;render=function(...args){const result=old.apply(this,args);enhance();return result};
installSearch({read:readingData,open:jump,blocked:()=>!!document.querySelector('#xpExam')});
// Wizard is mounted asynchronously outside the content tree.
const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.student-welcome')||n.querySelector?.('.student-welcome')))))declutter(document)});observer.observe(document.body,{childList:true,subtree:true});
enhance();

await import('./phase2-runtime.mjs?v=1498');

await import("./phase3-runtime.mjs");
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
