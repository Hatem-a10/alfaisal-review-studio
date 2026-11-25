import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import {ProgressDelta} from '../lib/progress-delta.js';
const browser=runInNewContext(readFileSync(new URL('../public/progress-delta.js',import.meta.url),'utf8')+'\nProgressDelta',{structuredClone});
const before={records:{a:{notes:'keep',done:{0:'yes'}},b:{notes:'old'}},settings:{theme:'dark'},extras:{version:1,stores:{}}};
const after={...before,records:{a:{notes:'new',done:{0:'yes'}},c:{notes:'added'}},settings:{theme:'light'}};
for(const [name,api] of [['server',ProgressDelta],['browser',browser]]){
 test(name+' rejects ambiguous operations and unsafe paths without mutating baseline',()=>{
  const bad=[[{path:['records','a'],value:{}},{path:['records','a','notes'],value:'x'}],[{path:['records','a','notes'],value:'x'},{path:['records','a'],value:{}}],[{path:['settings','theme'],value:'x'},{path:['settings','theme'],value:'y'}],[{path:['records','missing'],remove:true}],[{path:['settings','theme'],value:'x',extra:1}],[{path:['records','__proto__'],value:{}}]];
  for(const ops of bad){const original=JSON.stringify(before);assert.throws(()=>api.apply(before,ops));assert.equal(JSON.stringify(before),original)}
 });
 test(name+' accepts its own disjoint diff and retains unaffected evidence',()=>{const ops=api.diff(before,after);assert.equal(api.validate(ops),true);assert.deepEqual(JSON.parse(JSON.stringify(api.apply(before,ops))),after);assert.equal(before.records.a.notes,'keep')});
}
