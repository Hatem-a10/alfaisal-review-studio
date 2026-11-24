import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/course-packs.js',import.meta.url),'utf8');
function harness(){
 const scripts=[],timers=new Map(),events=[];let seq=0,failInsert=false;
 const content={innerHTML:''};
 const context={REVIEW_COURSE_PACKS:{MOL:'/mol.js',REN:'/ren.js'},view:'learning',render(){},esc:String,document:{getElementById:()=>content,createElement:()=>({remove(){this.removed=true}}),head:{append(script){if(failInsert)throw Error('insert failed');scripts.push(script)}},addEventListener(){}},setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(id){timers.delete(id)},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}},inlineLessonCache:new Map()};
 context.window=context;runInNewContext(source,context);
 return {context,scripts,timers,events,failInsert:v=>{failInsert=v}};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('stalled pack requires safe reload, and late readiness cannot unblock it',async()=>{
 const h=harness(),p=h.context.reviewEnsureCourses(['MOL']);await turn();assert.equal(h.scripts.length,1);
 const reject=assert.rejects(p,/timed out/);[...h.timers.values()][0]();await reject;
 assert.equal(h.scripts[0].removed,true);assert.equal(h.timers.size,0);
 h.context.__reviewCourseReady('MOL');
 assert.equal(h.context.reviewCourseLoaded('MOL'),false);assert.equal(h.events.length,0);
 await assert.rejects(h.context.reviewEnsureCourses(['MOL']),/timed out/);assert.equal(h.scripts.length,1);
});
test('network and synchronous insertion errors permit a clean retry',async()=>{
 const h=harness();h.failInsert(true);await assert.rejects(h.context.reviewEnsureCourses(['MOL']),/Could not start/);h.failInsert(false);
 const p=h.context.reviewEnsureCourses(['MOL']);await turn();const rejected=assert.rejects(p,/Could not download/);h.scripts[0].onerror();await rejected;
 const retry=h.context.reviewEnsureCourses(['MOL']);await turn();h.context.__reviewCourseReady('MOL');h.scripts[1].onload();await retry;
 assert.equal(h.context.reviewCourseLoaded('MOL'),true);assert.equal(h.timers.size,0);
});
test('unknown inherited keys cannot trigger script loading or readiness',async()=>{
 const h=harness();await h.context.reviewEnsureCourses(['constructor','toString','__proto__']);
 h.context.__reviewCourseReady('REN');h.context.__reviewCourseReady('constructor');
 assert.equal(h.scripts.length,0);assert.equal(h.events.length,0);assert.equal(h.context.reviewCourseLoaded('REN'),false);
});
test('duplicate concurrent requests load once and dispatch one readiness event',async()=>{
 const h=harness(),a=h.context.reviewEnsureCourses(['MOL']),b=h.context.reviewEnsureCourses(['MOL']);await turn();assert.equal(h.scripts.length,1);
 h.context.__reviewCourseReady('MOL');h.context.__reviewCourseReady('MOL');h.scripts[0].onload();await Promise.all([a,b]);
 assert.equal(h.events.length,1);assert.equal(h.context.reviewCourseLoaded('MOL'),true);assert.equal(h.timers.size,0);
});
