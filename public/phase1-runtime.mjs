/* global applyTheme, settings, render, view, storeOptions, DATA, LEARNING, uploads, inlineTopicsFor, lessonById, allLearningQuestions, TOPIC_CHECKS, inlineGroups, chooseLesson, go, libraryDocumentURL, sourceById */
import {deriveAccent} from './phase1-accent.mjs';
import {declutter} from './phase1-copy.mjs';
import {mountAcademicAdmin} from './phase1-academic-admin.mjs';
import {installSearch} from './phase1-search.mjs';
await Promise.all([import("./faculty-questions.mjs"),import("./reading-tools.js?v=1497"),import("./lecture-updates.js?v=1498")]);
await import("./mobile-dock.js?v=1498");
await import("./studio-navigation.js?v=1498");
let solver;
function themes(){const old=applyTheme;applyTheme=function(...args){const result=old.apply(this,args);for(const[key,value]of Object.entries(deriveAccent(settings.accent,settings.theme==='amoled')))document.documentElement.style.setProperty(key,value);return result};applyTheme()}
async function readingData(){await window.loadCvp19?.();await window.Cvp19?.ensure();await window.ensureObjectivePack?.();return {lectures:DATA.items.map(x=>({id:x.id,lecture:x.id,title:x.title||x.name||x.id,context:x.id})),objectives:LEARNING.lessons.flatMap(l=>inlineTopicsFor(l).map((t,i)=>({id:l.id+':'+i,lecture:l.id,topic:i,title:t.title||t.concept||'Objective',context:l.id}))),questions:allLearningQuestions().concat(Object.values(TOPIC_CHECKS).flat()).map(q=>({id:q.id,lecture:q.lessonId||q.lectureId||q.lectureIds?.[0],title:q.stem||q.question||q.prompt,context:q.lessonId||q.lectureId||q.lectureIds?.[0]||''})),materials:LEARNING.sources.concat(uploads).filter(s=>libraryDocumentURL(s)).map(s=>({id:s.id,title:s.displayName||s.name,context:'Material library'}))}}
function jump(item){if(item.kind==='material'){go('library');const url=libraryDocumentURL(sourceById(item.id));if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.click()}return}let id=item.lecture,topic=item.topic,index=-1;if(item.kind==='question'){for(const lesson of LEARNING.lessons){const groups=inlineGroups(lesson).groups;const found=groups.findIndex(group=>group.some(q=>q.id===item.id));if(found>=0){id=lesson.id;topic=found;index=groups[found].findIndex(q=>q.id===item.id);break}}}if(!lessonById(id))return;chooseLesson(id);if(Number.isInteger(topic)){guideTopic=cardIndex=topic;guideTopicLesson=id;learnTab='lesson';render()}requestAnimationFrame(()=>{const target=index>=0?document.getElementById('inline-question-'+index):document.querySelector('.guide-section,.complete-guide,.teaching-card,#inlineTopicQuestions');target?.scrollIntoView({block:'start',behavior:'instant'})})}
function enhance(){declutter(document);mountAcademicAdmin();if(view==='grades'){solver??=import('./grade-solver.mjs');solver.then(m=>{if(view==='grades')m.mountGradeSolver(document.getElementById('content'),()=>storeOptions().grades||[])})}}
themes();const old=render;render=function(...args){const result=old.apply(this,args);enhance();return result};
installSearch({read:readingData,open:jump,blocked:()=>!!document.querySelector('#xpExam')});
// Wizard is mounted asynchronously outside the content tree.
const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.student-welcome')||n.querySelector?.('.student-welcome')))))declutter(document)});observer.observe(document.body,{childList:true,subtree:true});
enhance();

await import('./phase2-runtime.mjs?v=1498');

await import("./phase3-runtime.mjs");
