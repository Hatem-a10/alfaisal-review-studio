import test from 'node:test';import assert from 'node:assert/strict';import {canPrefetch,installAdaptivePrefetch} from '../public/adaptive-prefetch.mjs';
test('slow, metered, offline, hidden or memory-limited connections never trigger speculation',()=>{
 const doc={visibilityState:'visible'};
 for(const nav of [{onLine:false},{connection:{saveData:true}},{connection:{effectiveType:'2g'}},{connection:{effectiveType:'3g'}},{connection:{downlink:0.7}},{deviceMemory:2}])assert.equal(canPrefetch(nav,doc),false);
 assert.equal(canPrefetch({}, {visibilityState:'hidden'}),false);assert.equal(canPrefetch({connection:{effectiveType:'4g',downlink:10}},{visibilityState:'visible'}),true);
});
test('prefetch only on direct learning or grade navigation intent, never private assets',()=>{
 const handlers={},created=[];
 const doc={visibilityState:'visible',head:{append(x){created.push(x)}},addEventListener(type,fn){handlers[type]=fn},createElement(tag){return {tag}},querySelector(){return null}};
 const p=installAdaptivePrefetch(doc,{},'https://studio.test/phase1-runtime.mjs');
 const hover=mode=>handlers.pointerover({target:{closest(){return {dataset:mode}}}});
 hover({view:'practice'});hover({learnTab:'quiz'});hover({learnTab:'quiz'});hover({view:'grades'});hover({view:'anki'});
 assert.equal(created.length,2);assert.equal(p.preloaded().length,2);
 assert.deepEqual(created.map(x=>new URL(x.href).pathname),['/learning-practice.mjs','/grade-solver.mjs']);
 assert.ok(created.every(x=>x.rel==='modulepreload'));
});
