import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

function cvpEntry({fresh=true,archive=false,permitted=false,view='practice'}={}){
 const host={innerHTML:''};let normal=0,loads=0;
 const window={REVIEW_STUDIO_FRESH_ACCOUNTS:fresh,reviewViewingArchive:()=>archive,reviewArchiveEnabled:()=>permitted};
 const ctx=vm.createContext({window,view,document:{getElementById:()=>host},render:()=>{normal++},console,toast:()=>{}});
 vm.runInContext(source('cvp19-entry.js'),ctx);
 window.loadCvp19=()=>{loads++;return new Promise(()=>{})};
 return {run:()=>ctx.render(),setArchive:(v,ok)=>{archive=v;permitted=ok},host,counts:()=>({normal,loads})};
}
test('archived CVP loader does not intercept active MOL/REN lessons or practice',()=>{
 for(const view of ['learning','practice']){
  const a=cvpEntry({fresh:true,view});
  a.run();a.run();
  assert.deepEqual(a.counts(),{normal:2,loads:0});
  assert.equal(a.host.innerHTML,'');
  a.setArchive(true,false);
  a.run();assert.equal(a.counts().loads,0);
  a.setArchive(true,true);a.run();
  assert.equal(a.counts().loads,1);
  assert.match(a.host.innerHTML,/Loading questions/);
 }
 const legacy=cvpEntry({fresh:false,view:'learning'});
 legacy.run();assert.equal(legacy.counts().loads,1);
});
test('CVP corrected-bank runtime leaves active study renders unblocked',()=>{
 for(const view of ['learning','practice']){
  const host={innerHTML:''};let normal=0;
  const window={REVIEW_STUDIO_FRESH_ACCOUNTS:true,reviewViewingArchive:()=>false,reviewArchiveEnabled:()=>false};
  const ctx=vm.createContext({window,view,render:()=>{normal++},document:{getElementById:()=>host},allLearningQuestions:()=>[],originalQuestionById:()=>null,saveOriginalRun:()=>{},conceptQuestionMarkup:()=>'',etQuestionMarkup:()=>'',originalQuestionMarkup:()=>'',originalRun:null,LEARNING:{questions:[],sources:[]},TOPIC_CHECKS:{},ORIGINAL_EXAMS:{questions:[],sources:[]},console});
  vm.runInContext(source('cvp19-runtime.mjs').replace('export function install()','function install()')+'\ninstall()',ctx);
  ctx.render();
  assert.equal(normal,1);
  assert.equal(host.innerHTML,'');
  assert.equal(typeof window.Cvp19.ensure,'function');
 }
});
function coursePacks({fresh=true,view='practice',archive=false,permitted=false,scope=null}={}){
 const host={innerHTML:''},scriptUrls=[];let normal=0;
 const win={REVIEW_STUDIO_FRESH_ACCOUNTS:fresh,reviewViewingArchive:archive?()=>true:undefined,reviewArchiveEnabled:permitted?()=>true:undefined,reviewCourseScope:scope};
 const document={getElementById:()=>host,addEventListener:()=>{},createElement:()=>({}),head:{append(script){scriptUrls.push(script.src)}},body:{classList:{contains:()=>false}}};
 const ctx=vm.createContext({window:win,document,view,lessonId:'MOL-1',render:()=>{normal++},esc:String,CustomEvent:class{},setTimeout:()=>0,clearTimeout:()=>{},REVIEW_COURSE_PACKS:{CVP:'/packs/cvp.js',MOL:'/packs/mol.js',REN:'/packs/ren.js'}});
 vm.runInContext(source('course-packs.js'),ctx);
 return {run:()=>ctx.render(),setArchive:(active,allow,course)=>{win.reviewViewingArchive=()=>active;win.reviewArchiveEnabled=()=>allow;win.reviewCourseScope=course},host,scriptUrls,counts:()=>normal};
}
test('course pack loading respects archive flag before workspace initializes',()=>{
 for(const view of ['learning','practice','booklet','library']){
  const a=coursePacks({fresh:true,view});
  a.run();assert.doesNotMatch(a.host.innerHTML,/CVP/i);
  assert.match(a.host.innerHTML,/MOL/);
 }
 const a=coursePacks({fresh:true,view:'practice',archive:true,permitted:true,scope:'CVP'});
 a.run();assert.match(a.host.innerHTML,/Opening CVP study content/);
 const denied=coursePacks({fresh:true,view:'practice',archive:true,permitted:false,scope:'CVP'});
 denied.run();assert.doesNotMatch(denied.host.innerHTML,/Opening CVP study content/);
 const legacy=coursePacks({fresh:false,view:'practice'});
 legacy.run();assert.match(legacy.host.innerHTML,/CVP/);
});
function supplemental({fresh=true,archive=false,permitted=false}={}){
 const paths=[],host={innerHTML:''};let normal=0,applied=0;
 const win={REVIEW_STUDIO_FRESH_ACCOUNTS:fresh,reviewViewingArchive:()=>archive,reviewArchiveEnabled:()=>permitted,addEventListener:()=>{}};
 const ctx=vm.createContext({window:win,view:'learning',render:()=>{normal++},LEARNING:{questions:[]},TOPIC_CHECKS:{},TEACHING:{guides:{}},inlineLessonCache:{clear(){}},applyLessonExpansion:()=>{applied++},document:{getElementById:()=>host,addEventListener:()=>{}},esc:String,fetch:async path=>{paths.push(path);return {ok:true,json:async()=>path.includes('supplemental-objective')?{questions:[],mappings:{},append:{}}:{}}}});
 vm.runInContext(source('supplemental-objectives.js'),ctx);
 return {init:()=>win.ensureObjectivePack(),render:()=>ctx.render(),setArchive:(value,allow)=>{archive=value;permitted=allow},paths,host,counts:()=>({normal,applied})};
}
test('CVP-specific walkthrough is fetched only after explicitly authorized archive visit',async()=>{
 const a=supplemental();await a.init();
 assert.deepEqual(a.paths.sort(),['/lesson-expansion-data-active.json?v=1','/supplemental-objective-questions-active.json?v=1','/topic-takeaways-active.json?v=1'].sort());
 a.render();assert.ok(a.counts().normal>0);
 a.setArchive(true,false);await a.init();assert.equal(a.paths.length,3);
 a.setArchive(true,true);await a.init();assert.deepEqual(a.paths.filter(x=>x.includes('cvp-source')),[ '/cvp-source-walkthroughs.json?v=2' ]);
 await a.init();assert.equal(a.paths.length,7);
 const b=supplemental({fresh:false});await b.init();assert.equal(b.paths.length,4);
 const c=supplemental({fresh:true,archive:true,permitted:true});await c.init();assert.equal(c.paths.length,4);
});
test('enriched search does not trigger archived bank requests before workspace policy loads',async()=>{
 const file=source('phase1-runtime.mjs'),expr=file.slice(file.indexOf('async function readingData('),file.indexOf('\nfunction jump('));
 assert.ok(expr.startsWith('async function readingData'));
 const calls=[],win={REVIEW_STUDIO_FRESH_ACCOUNTS:true,reviewEnsureCourses:async list=>calls.push(['courses',list]),ensureObjectivePack:async()=>calls.push(['objectives']),loadCvp19:async()=>calls.push(['cvp19'])};
 const ctx=vm.createContext({window:win,REVIEW_COURSE_PACKS:{MOL:'/m',CVP:'/c',REN:'/r'},LEARNING:{lessons:[],questions:[],sources:[]},TOPIC_CHECKS:{},DATA:{items:[]},uploads:[],inlineTopicsFor:()=>[],allLearningQuestions:()=>[],libraryDocumentURL:()=>null});
 vm.runInContext(expr+'\nthis.readingData=readingData',ctx);
 await ctx.readingData({enrich:true});
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['courses',['MOL','REN']],['objectives']]);
});

test('split active academic pack preserves every MOL question and restores canonical CVP order',async()=>{
 const original=JSON.parse(source('supplemental-objective-questions.json')),active=JSON.parse(source('supplemental-objective-questions-active.json'));
 const mol=original.questions.filter(q=>q.lectureIds.every(id=>id.startsWith('MOL-')));
 assert.equal(active.questions.length,624);
 assert.deepEqual(active.questions,mol);
 assert.deepEqual(active.mappings,Object.fromEntries(Object.entries(original.mappings).filter(([,value])=>JSON.stringify(value).includes('MOL-'))));
 assert.deepEqual(active.append,Object.fromEntries(Object.entries(original.append).filter(([id])=>/mol/i.test(id))));
 assert.deepEqual(JSON.parse(source('lesson-expansion-data-active.json')),Object.fromEntries(Object.entries(JSON.parse(source('lesson-expansion-data.json'))).filter(([id])=>id.startsWith('MOL-'))));
 assert.deepEqual(JSON.parse(source('topic-takeaways-active.json')),Object.fromEntries(Object.entries(JSON.parse(source('topic-takeaways.json'))).filter(([id])=>id.startsWith('MOL-'))));
 const paths=[],win={REVIEW_STUDIO_FRESH_ACCOUNTS:true,reviewViewingArchive:()=>false,reviewArchiveEnabled:()=>false,addEventListener:()=>{}};
 const learning={questions:[]},ctx=vm.createContext({window:win,view:'learning',render:()=>{},LEARNING:learning,TOPIC_CHECKS:{},TEACHING:{guides:{}},inlineLessonCache:{clear(){}},applyLessonExpansion:()=>{},document:{getElementById:()=>({innerHTML:''}),addEventListener:()=>{}},esc:String,fetch:async path=>{paths.push(path);return{ok:true,json:async()=>JSON.parse(source(path.split('?')[0].slice(1)))}}});
 vm.runInContext(source('supplemental-objectives.js'),ctx);
 await win.ensureObjectivePack();
 assert.equal(learning.questions.length,mol.length);
 assert.deepEqual(learning.questions.map(q=>q.id),mol.map(q=>q.id));
 win.reviewViewingArchive=()=>true;win.reviewArchiveEnabled=()=>true;
 await win.ensureObjectivePack();
 assert.equal(learning.questions.length,original.questions.length);
 assert.deepEqual(learning.questions.map(q=>q.id),original.questions.map(q=>q.id));
 assert.equal(paths.filter(p=>p.includes('cvp-source')).length,1);
 assert.equal(paths.filter(p=>p.includes('supplemental-objective-questions.json')).length,1);
});
