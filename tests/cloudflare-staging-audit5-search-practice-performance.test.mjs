import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {buildIndex,searchIndex} from '../public/phase1-search.mjs';
import {analytics} from '../public/phase2-practice-core.mjs';
const searchSource="// Index only source labels and stems; keys, answers and study-priority metadata stay out.\nexport const normalize=value=>String(value??'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,' ').trim();\nexport function buildIndex({lectures=[],objectives=[],questions=[],materials=[]}){const seen=new Set();return [['lecture',lectures],['objective',objectives],['question',questions],['material',materials]].flatMap(([kind,items])=>items.flatMap(item=>{const key=kind+':'+item.id;if(!item.id||!item.title||seen.has(key))return [];seen.add(key);return [{...item,kind,key,search:normalize(item.title+' '+(item.context||''))}]}))}\nexport function searchIndex(index,query,limit=40){const text=normalize(query),words=text.split(' ').filter(Boolean);if(!words.length)return [];return index.filter(item=>words.every(word=>item.search.includes(word))).map(item=>({item,rank:(normalize(item.title).startsWith(text)?100:0)+(item.kind==='lecture'?20:0)-item.title.length/1000})).sort((a,b)=>b.rank-a.rank||a.item.title.localeCompare(b.item.title)).slice(0,limit).map(x=>x.item)}\n";
const analyticsSource="export function analytics(booklet,mocks,questions,lectures=[]){const byId=new Map(questions.map(q=>[q.id,q])),rows={};function add(q,correct){if(typeof correct!=='boolean')return;const ids=[...new Set(q.lectureIds?.length?q.lectureIds:[])];const groups=ids.map(id=>lectures.find(x=>x.id===id)?.group||id.match(/^CVP-([A-Z]+)/)?.[1]).filter(Boolean).map(x=>'Discipline: '+x);if(!ids.length&&q.group)groups.push('Discipline: '+q.group);const keys=[...ids,...new Set(groups)];for(const k of keys){const r=rows[k]??={correct:0,total:0};r.total++;r.correct+=Number(correct)}}for(const [id,a] of Object.entries(booklet||{})){const q=byId.get(id);if(q&&a.completed)add(q,a.correct)}const counted=new Set();for(const m of mocks||[])for(const s of m.attempts||[m.snapshot]){if(!s?.finishedAt||s.excludedLowScore||!Array.isArray(s.questions)||s.id&&counted.has(s.id))continue;if(s.id)counted.add(s.id);for(let i=0;i<s.questions.length;i++){const a=s.answers?.[i],q=s.questions[i];if(q&&Number.isInteger(q.answer)&&Number.isInteger(a)&&a>=0&&a<q.options?.length&&q.answer>=0&&q.answer<q.options.length)add(q,a===q.answer)}}return Object.entries(rows).map(([id,v])=>({id,...v,accuracy:v.correct/v.total})).sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total||a.id.localeCompare(b.id))}";
function frozen(source,names){return vm.runInThisContext('(function(){'+source.replaceAll('export ','')+';return {'+names+'}})()')}
const beforeSearch=frozen(searchSource,'buildIndex,searchIndex');
const beforeAnalytics=frozen(analyticsSource,'analytics').analytics;
function median(fn){const samples=[];for(let i=0;i<3;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[1]}
test('A5-111 cached title normalization preserves search ranking, entry identity, and title changes',()=>{
 const data={lectures:Array.from({length:600},(_,i)=>({id:'L'+i,title:'Renal physiology '+i,context:'MOL REN'})),questions:Array.from({length:5000},(_,i)=>({id:'Q'+i,title:'Renal glomérular question '+i,context:'Renal physiology'}))};
 const old=beforeSearch.buildIndex(data),next=buildIndex(data);
 assert.deepEqual(next,old);
 const queries=['renal','renal glomerular','physiology','Renal glomérular','MOL','renal 9','nothing'];
 for(const query of queries)for(const limit of [0,5,40,100])assert.deepEqual(searchIndex(next,query,limit),beforeSearch.searchIndex(old,query,limit));
 const run=(search,index)=>{for(let i=0;i<3;i++)for(const query of queries)search(index,query)};
 console.log(JSON.stringify({label:'A5-111 warm search',baselineMedianMs:median(()=>run(beforeSearch.searchIndex,old)),candidateMedianMs:median(()=>run(searchIndex,next))}));
 const index=buildIndex({lectures:[{id:'a',title:'Renal z'},{id:'b',title:'Glomerular renal'}]});
 assert.equal(searchIndex(index,'renal')[0],index[0]);
 index[0].title='Changed';
 assert.deepEqual(searchIndex(index,'renal'),beforeSearch.searchIndex(index,'renal'));
});
test('A5-023 practice group memoization retains first-match behavior and limits redundant lookups',()=>{
 const lectures=Array.from({length:500},(_,i)=>({id:'L'+i,group:'Group '+i%5}));lectures.push({id:'L499',group:'different'});
 const questions=Array.from({length:4000},(_,i)=>({id:'q'+i,lectureIds:['L'+(450+i%50),'CVP-ANATOMY'],options:['a','b'],answer:0}));
 const booklet=Object.fromEntries(questions.map((q,i)=>[q.id,{completed:true,correct:i%3===0}]));
 const mocks=[{attempts:[{id:'x',finishedAt:'2026-11-24',questions:questions.slice(0,500),answers:Array(500).fill(0)}]}];
 let count=0;const rows=lectures.slice();rows.find=function(...args){count++;return Array.prototype.find.apply(this,args)};
 const expected=beforeAnalytics(booklet,mocks,questions,rows),oldCount=count;count=0;
 assert.deepEqual(analytics(booklet,mocks,questions,rows),expected);assert.equal(oldCount,9000);assert.equal(count,51);
 console.log(JSON.stringify({label:'A5-023',baselineFindCalls:oldCount,candidateFindCalls:count,baselineMedianMs:median(()=>beforeAnalytics(booklet,mocks,questions,lectures)),candidateMedianMs:median(()=>analytics(booklet,mocks,questions,lectures))}));
 lectures[499].group='Updated';
 assert.deepEqual(analytics(booklet,mocks,questions,lectures),beforeAnalytics(booklet,mocks,questions,lectures));
});
