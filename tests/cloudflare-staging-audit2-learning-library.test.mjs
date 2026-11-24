import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {solveTarget,mountGradeSolver} from '../public/grade-solver.mjs';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const learning=read('learning.js');
const get=name=>{const line=learning.split('\n').find(l=>l.startsWith('function '+name+'('));assert.ok(line);return line};
test('active lesson catalogue includes registered courses and excludes hidden courses',()=>{
 const html=runInNewContext(get('lessonCatalog')+'\nlessonCatalog()',{
 DATA:{items:[{id:'CVP-A1',course:'CVP',code:'A1'},{id:'MOL-1',course:'MOL',code:'1'},{id:'REN-A1',course:'REN',code:'A1'}]},
 lessonCourse:'all',lessonSearch:'',lessonId:'REN-A1',title:x=>x.id,esc:String,learningStatus:()=>({known:0,total:5}),
 reviewStudyItemVisible:x=>x.course!=='CVP',reviewLessonCourseOptions:()=>[['all','All available courses'],['MOL','MOL 114'],['REN','REN 123']]
 });
 assert.match(html,/REN 123/);assert.match(html,/data-lesson="REN-A1"/);assert.doesNotMatch(html,/CVP-A1|CVP 112/);
});
test('document passages require every term and locate snippet near match',()=>{
 const html=runInNewContext(get('searchPassages')+'\nsearchPassages()',{
 sourceSearch:'renal clearance',LEARNING:{sources:[{name:'Partial',pages:[{page:1,text:'renal only'}]},{name:'Complete',pages:[{page:2,text:'x'.repeat(800)+' clearance and renal function'}]}]},uploads:[],uploadBodies:{},libraryDocumentURL:()=>'/file.pdf',librarySourceInCourse:()=>true,esc:String
 });
 assert.match(html,/1 matching extracted pages/);assert.match(html,/clearance and renal function/);assert.doesNotMatch(html,/Partial/);
});
test('REN target solver accepts course weights and renders a registered course option',()=>{
 const controls=new Map(),section={dataset:{},querySelector(k){if(!controls.has(k))controls.set(k,{});return controls.get(k)}};
 const old=globalThis.document;globalThis.document={createElement:()=>section};try{mountGradeSolver({querySelector:()=>null,append(){}},()=>[]);assert.match(section.innerHTML,/value="REN">REN 123/)}finally{globalThis.document=old}
 assert.equal(solveTarget([{weight:100,total:100,completed:false}],65).requiredPercent,65);
});
test('empty-page reader and fatal course load have explicit safe recovery paths',()=>{
 assert.match(learning,/No extracted pages are available/);
 assert.match(read('course-packs.js'),/fatal\?' <button id="reloadForCourse"/);
});
