import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=" function pagesFor(term){if(termCache.has(term))return termCache.get(term);const seen=new Set();if(term.length===1){for(const i of searchIndex.terms[term]||[])seen.add(i)}else{for(const[word,rows]of Object.entries(searchIndex.terms))if(word.includes(term))for(const i of rows)seen.add(i)}rememberTerm(term,seen);return seen}";
const helpers=" let searchIndex=null,searchIndexURL=null;const termCache=new Map(),termCacheMaxEntries=100,termCacheMaxBytes=2*1024*1024;let termCacheBytes=0;\n function termCost(term,pages){return 128+term.length*2+pages.size*32}\n function rememberTerm(term,pages){const bytes=termCost(term,pages);if(bytes>termCacheMaxBytes)return;while(termCache.size&&(termCache.size>=termCacheMaxEntries||termCacheBytes+bytes>termCacheMaxBytes)){const oldest=termCache.keys().next().value;termCacheBytes-=termCost(oldest,termCache.get(oldest));termCache.delete(oldest)}termCache.set(term,pages);termCacheBytes+=bytes}";
const candidate=readFileSync(new URL('../public/source-demand.js',import.meta.url),'utf8').split('\n').find(x=>x.trim().startsWith('function pagesFor('));
function fixture(pagesForSource,large=false){
 const calls=new Map(),terms={};
 const names=large?Array.from({length:3000},(_,i)=>'unused'+i).concat(['hotkey','bbkey','cckey','ddkey']):['a','b','c','d'];
 names.forEach((k,i)=>Object.defineProperty(terms,k,{enumerable:true,get(){calls.set(k,(calls.get(k)||0)+1);return [i,i+1]}}));
 const context=vm.createContext({});vm.runInContext(`let searchIndex={terms:globalThis.terms};`+helpers.replace('termCacheMaxEntries=100','termCacheMaxEntries=3')+'\n'+pagesForSource+';this.run=pagesFor;this.cache=termCache;',Object.assign(context,{terms}));
 return {run:t=>Array.from(context.run(t)),keys:()=>Array.from(context.cache.keys()),calls:()=>Object.fromEntries(calls)};
}
test('A5-199 hot term survives the eviction window and results remain identical to FIFO',()=>{
 const before=fixture(base),after=fixture(candidate);
 for(const term of ['a','b','c','a','d']){
  assert.deepEqual(after.run(term),before.run(term));
 }
 assert.deepEqual(before.keys(),['b','c','d']);
 assert.deepEqual(after.keys(),['c','a','d']);
 assert.deepEqual(after.run('a'),before.run('a'));
 assert.equal(before.calls().a,2);
 assert.equal(after.calls().a,1);
});
const median=fn=>{fn();const x=[];for(let i=0;i<7;i++){const t=performance.now();fn();x.push(performance.now()-t)}return x.sort((a,b)=>a-b)[3]};
test('A5-199 repeated expensive substring queries retain recently reused results',()=>{
 const a=fixture(base,true),b=fixture(candidate,true);
 const run=x=>{for(let i=0;i<50;i++)for(const term of ['hot','bb','cc','hot','dd','hot'])x.run(term)};
 run(a);run(b);
 const baselineMedianMs=median(()=>run(a)),candidateMedianMs=median(()=>run(b));
 assert.ok(candidateMedianMs<baselineMedianMs);
 assert.ok((b.calls().hotkey||0)<(a.calls().hotkey||0));
 console.log(JSON.stringify({label:'A5-199 source term LRU',baselineMedianMs,candidateMedianMs,baselineHotPostingReads:a.calls().hotkey,candidateHotPostingReads:b.calls().hotkey,indexTerms:3004}));
});
