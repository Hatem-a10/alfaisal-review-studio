/* global applyTheme, settings, render, view, storeOptions, DATA, LEARNING, uploads, inlineTopicsFor, lessonById, allLearningQuestions, TOPIC_CHECKS, inlineGroups, chooseLesson, go, libraryDocumentURL, sourceById */
import {deriveAccent} from './phase1-accent.mjs';
import {declutter} from './phase1-copy.mjs';
import {mountAcademicAdmin} from './phase1-academic-admin.mjs';
import {installSearch} from './phase1-search.mjs';
await Promise.all([import("./reading-tools.js?v=1497"),import("./lecture-updates.js?v=1498")]);
await import("./mobile-dock.js?v=1498");
await import("./studio-navigation.js?v=1498");
let solver,solverRetries=0;
// Mid tones of the eight stain palettes in redesign.css (--st-b), in the same order.
export const STAIN_ACCENTS=['#3a2f86','#245796','#8e2a6c','#226a8f','#5c4428','#246b52','#4d3a99','#93302d'];
const DEFAULT_ACCENTS=/^#(?:5b4bd0|2f6c52)$/i;
function themes(){const old=applyTheme;let lastColor,lastDark,paletteEntries;applyTheme=function(...args){const result=old.apply(this,args),root=document.documentElement,stain=Number(window.reviewNextStain?.()??0)%8,auto=typeof settings.accentAuto==='boolean'?settings.accentAuto:!(/^#[0-9a-f]{6}$/i.test(settings.accent||'')&&!DEFAULT_ACCENTS.test(settings.accent)),color=auto?STAIN_ACCENTS[stain]:settings.accent,dark=settings.theme==='amoled',stainValue=String(stain),accentValue=auto?'auto':'solid';if(root.dataset.stain!==stainValue)root.dataset.stain=stainValue;if(root.dataset.accent!==accentValue)root.dataset.accent=accentValue;if(!paletteEntries||color!==lastColor||dark!==lastDark){paletteEntries=Object.entries(deriveAccent(color,dark));lastColor=color;lastDark=dark}for(const[key,value]of paletteEntries)if(root.style.getPropertyValue?.(key)!==value||root.style.getPropertyPriority?.(key))root.style.setProperty(key,value);return result};applyTheme()}
async function readingData({enrich=false}={}){
 const archived=item=>window.reviewArchivedStudyItem?.(item)===true;
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
function enhance(){declutter(document);mountAcademicAdmin();if(view==='grades'){solver??=solverRetries?import('./grade-solver.mjs?retry='+solverRetries):import('./grade-solver.mjs');const pending=solver;pending.then(m=>{if(view==='grades')m.mountGradeSolver(document.getElementById('content'),()=>storeOptions().grades||[])}).catch(()=>{if(solver===pending){solver=null;solverRetries++}if(view!=='grades')return;const host=document.getElementById('content');if(!host||host.querySelector('[data-grade-retry]'))return;const note=document.createElement('p'),button=document.createElement('button');note.dataset.gradeRetry='';note.setAttribute('role','status');note.textContent='Score Needed could not load. ';button.type='button';button.textContent='Retry';button.onclick=()=>{note.remove();enhance()};note.append(button);host.append(note)})}}
themes();const old=render;render=function(...args){const result=old.apply(this,args);enhance();return result};
installSearch({read:readingData,open:jump,blocked:()=>!!document.querySelector('#xpExam')});
// Wizard is mounted asynchronously outside the content tree.
const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.student-welcome')||n.querySelector?.('.student-welcome')))))declutter(document)});observer.observe(document.body,{childList:true,subtree:true});
enhance();

await import('./phase2-runtime.mjs?v=1498');

await import("./phase3-runtime.mjs");
await import("./course-workspace.mjs");
