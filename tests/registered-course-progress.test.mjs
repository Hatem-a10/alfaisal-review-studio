import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {courses,lectureCourses} from '../public/course-registry.mjs';
import {archiveViews,workspaceRoute} from '../public/course-workspace-core.mjs';
import {renalTeachingPack} from '../public/renal-lessons.mjs';
import {ProgressDelta} from '../lib/progress-delta.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const classic=runInNewContext(read('public/data.js')+'\n;DATA');
const items=[...classic.items,...renalTeachingPack().items];

test('every displayed lecture is registered for sync and every course resolves to shared views',()=>{
 assert.deepEqual([...new Set(items.map(item=>item.id))].sort(),[...lectureCourses.keys()].sort());
 for(const [course,config] of Object.entries(courses)){
  for(const view of archiveViews){
   if(view==='ospe'&&config.noOspe)assert.equal(workspaceRoute('#'+config.slug+'/'+view),null);
   else assert.deepEqual(workspaceRoute('#'+config.slug+'/'+view),{course,view});
  }
 }
});

test('managed workspaces delegate screen rendering to the common renderer',()=>{
 const calls=[];
 const nodes={insertAdjacentHTML(){}};
 const window={REVIEW_STUDIO_FRESH_ACCOUNTS:true,reviewManagedFlags:{archiveCvp:true},chooseLesson(){},addEventListener(){}};
 const ctx={
  window,location:{hash:''},history:{pushState(_state,_unused,hash){ctx.location.hash=hash}},
  document:{documentElement:{dataset:{}},body:{classList:{toggle(){}}},getElementById(id){return id==='content'?nodes:null},
   querySelector(){return null},querySelectorAll(){return []},addEventListener(){}},
  DATA:{items:[]},LEARNING:{lessons:[],sources:[],questions:[]},TEACHING:{guides:{}},
  go(){},render(){calls.push(ctx.view)},tasks(){},campusWeekEvents(){},applyTheme(){},paintProfile(){},
  view:'dashboard',lessonId:'MOL-1',lessonCourse:'MOL',learnTab:'lesson',etLecture:'MOL-1',etScope:'MOL',
  etMockScope:'MOL',etAccurate:false,etExam:null,originalRun:null,esc:String,intro(){return '';},
  dates:item=>item.dates,archiveViews,renalViews:['dashboard',...archiveViews],workspaceRoute,courses,
  renalTeachingPack,isCvpStudyItem:()=>false,
 };
 const source=read('public/course-workspace.mjs').replace(/^import .*;$/gm,'');
 runInNewContext(source+'\n;globalThis.openCourse=open;',ctx);
 for(const [course,config] of Object.entries(courses)){
  for(const view of archiveViews.filter(view=>view!=='ospe'||!config.noOspe)){
   ctx.openCourse(config.slug,view);
   assert.equal(calls.pop(),view,course+' '+view+' should use the shared renderer');
  }
 }
});

test('progress PUT and PATCH preserve archived history and accept Renal records without scheduled dates',async t=>{
 const db=new DatabaseSync(':memory:');
 t.after(()=>db.close());
 db.exec('CREATE TABLE study_snapshots (user_id TEXT PRIMARY KEY, revision INTEGER, snapshot TEXT, updated_at TEXT)');
 globalThis.courseSyncFixture={DB:{prepare(sql){return{bind(...args){return{
  first:async()=>db.prepare(sql).get(...args)??null,
  run:async()=>({meta:db.prepare(sql).run(...args)}),
 }}}}}};
 const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return next('data:text/javascript,export const env=globalThis.courseSyncFixture;',context);
  if(specifier==='../../../lib/progress-delta')return next(specifier+'.js',context);
  return next(specifier,context);
 }});
 t.after(()=>{hooks.deregister();delete globalThis.courseSyncFixture;});
 const {GET,PUT,PATCH}=await import('../app/api/progress/route.ts');
 function call(handler,body,account='example-student'){
  const origin='https://sync.example';
  return handler(new Request(origin+'/api/progress',{
   method:handler.name,headers:{origin,'oai-authenticated-user-id':account},
   body:body===undefined?undefined:JSON.stringify(body),
  }));
 }
 const at='2026-11-24T05:15:00.000Z';
 const archived=Object.fromEntries(classic.items.map(item=>[item.id,{done:{0:at},dates:item.dates}]));
 const state={app:'alfaisal-review-studio',version:2,records:{...archived,'REN-A1':{dates:[],done:{0:at},notes:'Synthetic notes'}}};
 assert.equal((await call(PUT,{revision:0,snapshot:state})).status,200);
 const next=structuredClone(state);
 next.records['REN-P2']={done:{1:at},learning:{results:{question:{c:'clearance',ok:true,at}}}};
 const patch=ProgressDelta.diff(state,next);
 assert.equal((await call(PATCH,{revision:1,patch})).status,200);
 assert.equal((await call(PATCH,{revision:1,patch})).status,409);
 assert.equal((await call(PATCH,{revision:2,patch:[{path:['records','REN-X99'],value:{notes:'Unknown lecture'}}]})).status,400);
 assert.equal((await call(PUT,{revision:2,snapshot:{...next,records:{'REN-A1':{dates:['wrong']}}}})).status,400);
 const remote=await (await call(GET)).json();
 assert.equal(remote.revision,2);
 assert.deepEqual(remote.snapshot.records,next.records);
 assert.equal((await (await call(GET,undefined,'another-student')).json()).snapshot,null);
});

test('deferred papers retain valid saved question IDs before their protected bank loads',()=>{
 const source=read('public/original-exams.js');
 const matches=runInNewContext(source.slice(source.indexOf('function deferredOriginalQuestion('),
  source.indexOf('function examSetTitle('))+';deferredOriginalQuestion;');
 assert.equal(matches('ren-18-tbl-1','ren-18-tbl-1-mcq-3'),true);
 assert.equal(matches('ren-14-tbl-2','ren-14-tbl-2-cs-1'),true);
 assert.equal(matches('ren-18-collection-ospe','ren-18-collection-ospe-20'),true);
 assert.equal(matches('mol-18-final','mol-18-final-p2-item3'),true);
 assert.equal(matches('ren-18-tbl-1','ren-18-tbl-2-mcq-3'),false);
 assert.equal(matches('ren-18-collection-ospe','ren-18-collection-saq-2'),false);
 assert.equal(matches('ren-18-tbl-1','ren-18-tbl-1-mcq-NaN'),false);
});
