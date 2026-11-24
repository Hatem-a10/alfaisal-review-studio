import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {safeClientError,readClientError} from '../lib/client-error.mjs';
import {allowProductionWrite} from '../lib/production-access.mjs';

test('telemetry strips arbitrary exception text, stack, URLs, identity and extra fields',()=>{
 const privateValue='student@example.test secret answer';
 const value=safeClientError({kind:privateValue,message:privateValue,stack:privateValue,source:privateValue,view:privateValue,version:privateValue,line:4,col:2,account:privateValue});
 assert.deepEqual(value,{kind:'Unknown',line:4,col:2,version:''});
 assert.deepEqual(safeClientError({kind:'TypeError',version:'v1.77',line:-1,col:Infinity}),{kind:'TypeError',version:'v1.77',line:0,col:0});
 assert.equal(safeClientError(null),null);
});
test('error intake accepts valid bounded JSON and rejects oversized, malformed or non-object reports',async()=>{
 const request=body=>new Request('https://test.invalid/api/client-error',{method:'POST',body});
 assert.deepEqual(await readClientError(request('{"kind":"ReferenceError","line":2}')),{kind:'ReferenceError',line:2,col:0,version:''});
 assert.equal(await readClientError(request('x'.repeat(4001))),null);
 assert.equal(await readClientError(request('{"message":"'+ 'é'.repeat(2100)+'"}')),null);
 assert.equal(await readClientError(request('not JSON')),null);
 assert.equal(await readClientError(request('[]')),null);
});
test('production telemetry has its own limited rate bucket',async()=>{
 let bindings;
 const db={prepare(){return {bind(...args){bindings=args;return {first:async()=>({attempts:1})}}}}};
 assert.equal(await allowProductionWrite(db,'actor','api/client-error','POST',0),true);
 assert.deepEqual(bindings,['actor','production-client-error',0,30]);
});

const script=readFileSync(new URL('../public/course-packs.js',import.meta.url),'utf8');
function harness(){
 const content={innerHTML:''},scripts=[],listeners={};
 let view='learning';
 const globals={view,REVIEW_COURSE_PACKS:{MOL:'/mol.js'},reviewCourseScope:'MOL',lessonId:'MOL-1',esc:s=>String(s),render(){content.innerHTML='PAGE:'+globals.view},document:{getElementById:()=>content,head:{append:s=>scripts.push(s)},createElement:()=>({remove(){}}),addEventListener:(name,fn)=>{listeners[name]=fn},body:{classList:{contains:()=>false}}},CustomEvent:class{},dispatchEvent(){},inlineLessonCache:{clear(){}}};
 globals.window=globals;
 runInNewContext(script,globals);
 return {globals,content,scripts,listeners};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('late course failure does not replace a new view',async()=>{
 const h=harness();h.globals.render();await tick();
 assert.equal(h.scripts.length,1);
 h.globals.view='dashboard';h.globals.render();assert.equal(h.content.innerHTML,'PAGE:dashboard');
 h.scripts[0].onerror();await tick();
 assert.equal(h.content.innerHTML,'PAGE:dashboard');
});
test('current course failure renders retry, and successful retry restores content',async()=>{
 const h=harness();h.globals.render();await tick();h.scripts[0].onerror();await tick();
 assert.match(h.content.innerHTML,/retryCourse/);
 h.globals.render();await tick();assert.equal(h.scripts.length,2);
 h.globals.__reviewCourseReady('MOL');h.scripts[1].onload();await tick();
 assert.equal(h.content.innerHTML,'PAGE:learning');
});
