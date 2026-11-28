import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="function learningStatus(id){const l=LEARNING.lessons.find(l=>l.id===id);return Learn.status(l,state[id]||{},today())}\nfunction lessonCatalog(){let a=DATA.items.filter(x=>globalThis.reviewStudyItemVisible?.(x)!==false&&(lessonCourse==='all'||lessonCourse==='midterm'&&x.midterm||lessonCourse===x.course)&&(!lessonSearch||(title(x)+' '+x.code).toLowerCase().includes(lessonSearch.toLowerCase())));return `<aside class=\"lesson-catalog\"><div class=\"catalog-head\"><h3>Lesson index</h3><input id=\"lessonSearch\" type=\"search\" value=\"${esc(lessonSearch)}\" placeholder=\"Search a lesson…\" aria-label=\"Search lessons\"><select id=\"lessonCourse\" aria-label=\"Lesson course\">${(globalThis.reviewLessonCourseOptions?.()||[['all','All courses'],['MOL','MOL 114'],['CVP','CVP 112']]).map(([id,t])=>`<option value=\"${id}\" ${lessonCourse===id?'selected':''}>${t}</option>`).join('')}</select></div><div class=\"catalog-list\">${a.map(x=>{const s=learningStatus(x.id);return `<button data-lesson=\"${x.id}\" class=\"${x.id===lessonId?'chosen':''} ${s.passed?'lesson-mastered':''}\"><span>${esc(x.course==='CVP'?'CVP '+x.code:x.code)} </span><strong>${esc(title(x))}</strong><small>${s.passed?'✓ MCQ target reached':s.known+'/'+s.total+' topics stable'}</small></button>`}).join('')||'<p class=\"muted\">No matching lesson.</p>'}</div></aside>`}";
const candidate=readFileSync(new URL('../public/learning.js',import.meta.url),'utf8').split('\n').filter(l=>l.startsWith('function learningStatus(')||l.startsWith('function lessonCatalog(')).join('\n');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fixture(source,n=180){
 let idReads=0,chosen=[];
 const makeLesson=(id,index)=>({get id(){idReads++;return id},facts:[{id:id+'-concept'}],index});
 const lessons=Array.from({length:n},(_,i)=>makeLesson('REN-A'+i,i));
 if(n>20)lessons.splice(18,0,makeLesson('REN-A17',999));
 const items=Array.from({length:n},(_,i)=>({id:'REN-A'+i,course:i%7===0?'MOL':'REN',code:'A'+i,title:'Lecture '+i,midterm:i%3===0}));
 const context=vm.createContext({LEARNING:{lessons},DATA:{items},state:{},lessonCourse:'all',lessonSearch:'',lessonId:'REN-A5',Learn:{status:(l,r,d)=>{chosen.push(l?.index);return {passed:false,known:l?.index??0,total:l?.facts?.length||0}}},globalThis:{reviewStudyItemVisible:()=>true,reviewLessonCourseOptions:()=>[['all','All']]},title:x=>x.title,esc,today:()=> '2026-11-24'});
 vm.runInContext(source+'\nthis.catalog=lessonCatalog',context);
 return {run:()=>context.catalog(),counts:()=>({idReads,chosen:chosen.slice()}),reset:()=>{idReads=0;chosen=[]},filter:(course,search)=>{context.lessonCourse=course;context.lessonSearch=search},edit:()=>{lessons[4]=makeLesson('REN-A4',1500)},items,lessons};
}
const median=fn=>{fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]};
test('A5-113 catalog ID index preserves exact markup, duplicate precedence and dynamic edits',()=>{
 for(const n of [3,15,16,25,180]){
  const a=fixture(baseline,n),b=fixture(candidate,n);
  for(const [course,search] of [['all',''],['all','Lecture 2'],['REN',''],['MOL','Lecture'],['midterm','']]){
   a.filter(course,search);b.filter(course,search);assert.equal(b.run(),a.run(),JSON.stringify({course,search,n}));
   assert.deepEqual(b.counts().chosen,a.counts().chosen);
  }
  a.edit();b.edit();a.filter('all','');b.filter('all','');assert.equal(b.run(),a.run());
 }
});
test('A5-113 large academic catalog indexes IDs only for one synchronous render',()=>{
 const a=fixture(baseline,1200),b=fixture(candidate,1200);
 assert.equal(b.run(),a.run());
 const original=a.counts(),newer=b.counts();assert.ok(newer.idReads<original.idReads/4,{original:original.idReads,candidate:newer.idReads});
 const baselineMedianMs=median(a.run),candidateMedianMs=median(b.run);
 console.log(JSON.stringify({label:'A5-113 exact lecture lookup',baselineMedianMs,candidateMedianMs,lectures:1200,baselineIdReads:original.idReads,candidateIdReads:newer.idReads}));
});
