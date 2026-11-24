import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {buildIndex,searchIndex} from '../public/phase1-search.mjs';
// Frozen pre-batch search source: da6a00b0cfd9d6d92f99703c0b0bf9046c5f40d5.
const baseline=vm.runInThisContext('(function(){'+"// Index only source labels and stems; keys, answers and study-priority metadata stay out.\nexport const normalize=value=>String(value??'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,' ').trim();\nconst titleCache=new WeakMap();\nfunction normalizedTitle(item){const title=item.title;if(typeof title!=='string')return normalize(title);const cached=titleCache.get(item);if(cached?.title===title)return cached.normalized;const normalized=normalize(title);titleCache.set(item,{title,normalized});return normalized}\nexport function buildIndex({lectures=[],objectives=[],questions=[],materials=[]}){const seen=new Set();return [['lecture',lectures],['objective',objectives],['question',questions],['material',materials]].flatMap(([kind,items])=>items.flatMap(item=>{const key=kind+':'+item.id;if(!item.id||!item.title||seen.has(key))return [];seen.add(key);const entry={...item,kind,key,search:normalize(item.title+' '+(item.context||''))};return [entry]}))}\nexport function searchIndex(index,query,limit=40){const text=normalize(query),words=text.split(' ').filter(Boolean);if(!words.length)return [];return index.filter(item=>words.every(word=>item.search.includes(word))).map(item=>({item,rank:(normalizedTitle(item).startsWith(text)?100:0)+(item.kind==='lecture'?20:0)-item.title.length/1000})).sort((a,b)=>b.rank-a.rank||a.item.title.localeCompare(b.item.title)).slice(0,limit).map(x=>x.item)}\n".replaceAll('export ','')+';return {searchIndex}})()').searchIndex;
function median(fn){fn();const samples=[];for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
test('A5-115 bounded top-k preserves stable ranking and unusual slice limits',()=>{
 const index=buildIndex({lectures:Array.from({length:300},(_,i)=>({id:'l'+i,title:'Renal '+i%15,context:'MOL REN'})),questions:Array.from({length:20000},(_,i)=>({id:'q'+i,title:(i%3===0?'Renal ':'Question ')+(i%2?'glomérular ':'glomérular ')+(i*7919%1009),context:'Renal physiology'}))});
 for(const query of ['renal','renal glomerular','physiology','MOL','renal 9','nothing',''])for(const limit of [undefined,0,-2,1,5,40,100,101,1.5,Infinity,NaN]){
  const actual=searchIndex(index,query,limit),expected=baseline(index,query,limit);
  assert.equal(actual.length,expected.length);
  actual.forEach((entry,i)=>assert.equal(entry,expected[i]));
 }
 const ties=Array.from({length:300},(_,i)=>({id:'t'+i,title:'Renal',kind:'lecture',search:'renal'}));
 assert.deepEqual(searchIndex(ties,'renal',40),ties.slice(0,40));
 const before=median(()=>baseline(index,'renal',40)),after=median(()=>searchIndex(index,'renal',40));
 console.log(JSON.stringify({label:'A5-115 broad warm query',baselineMedianMs:before,candidateMedianMs:after,indexSize:index.length,baselineRankedResultArraySize:index.length,candidateMaximumRetainedRankedResults:40}));
});
