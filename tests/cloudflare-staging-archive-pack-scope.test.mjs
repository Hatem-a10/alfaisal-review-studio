import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const runtime=readFileSync(new URL('../public/course-packs.js',import.meta.url),'utf8');
const start=runtime.indexOf(' function needed(){');
const end=runtime.indexOf(" let painted=",start);
assert.ok(start>=0&&end>start);
const source=runtime.slice(start,end);
function needed({view='learning',lessonId='CVP-P1',scope=null,archived=true,permission=false,inArchive=false}={}){
 const window={reviewCvpArchived:()=>archived,reviewArchiveEnabled:()=>permission,reviewViewingArchive:()=>inArchive,reviewCourseScope:scope,reviewCourseConfig:()=>null};
 const context={window,view,lessonId,packs:{CVP:'cvp.js',MOL:'mol.js'},noContent:new Set(['dashboard']),everything:new Set(['weakness','wrong-bank','sources','search'])};
 return Array.from(runInNewContext(source+'\nneeded()',context));
}
test('active learning ignores a stale archived lecture even without archive permission',()=>{
 assert.deepEqual(needed(),['MOL']);
 assert.deepEqual(needed({permission:true}),['MOL']);
});
test('mixed views avoid downloading a hidden CVP pack',()=>{
 for(const view of ['weakness','wrong-bank','sources','search'])assert.deepEqual(needed({view,permission:true}),['MOL']);
});
test('explicit archive browsing still loads CVP when permitted',()=>{
 assert.ok(needed({permission:true,inArchive:true}).includes('CVP'));
 assert.deepEqual(needed({view:'practice',scope:'CVP',permission:true,inArchive:true}),['CVP']);
});
test('stale archive route or scope cannot request hidden CVP',()=>{
 assert.deepEqual(needed({view:'practice',scope:'CVP',inArchive:true}),[]);
});
test('legacy behavior and dashboard remain unchanged',()=>{
 assert.deepEqual(needed({archived:false}),['CVP','MOL']);
 assert.deepEqual(needed({view:'dashboard'}),[]);
 assert.deepEqual(needed({view:'practice',scope:'MOL'}),['MOL']);
});
