import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import vm from 'node:vm';
import {questionHistory,historyDates} from '../public/activity-metrics.mjs';

// Frozen pre-optimization source (blob 90ddb5ded7087bb05e323f58576e042c511c51f9); test-only, never shipped.
const baseline="const validDay=d=>typeof d==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;\nconst dateOf=value=>{\n if(typeof value!=='string'&&typeof value!=='number'||value===''||typeof value==='number'&&!Number.isFinite(value))return null;\n if(typeof value==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return validDay(value)?value:null;\n try{const d=new Date(value);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):null}catch{return null}\n};\nconst array=value=>Array.isArray(value)?value:[];\nconst object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};\nconst idOf=value=>typeof value==='string'&&value.length>0?value:null;\nfunction attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}\n// Unique recorded question identities per day; do not infer unsaved historical attempts.\nexport function questionHistory(records,practice={}){\n const days=new Map(),aliases=new Map(),attempts=attemptsOf(practice);\n function bucket(at){const day=dateOf(at);if(!day)return null;if(!days.has(day))days.set(day,{questions:new Set(),aggregates:new Map()});return days.get(day)}\n function put(at,id){if(idOf(id))bucket(at)?.questions.add(id)}\n for(const s of attempts)for(const q of array(s.questions)){\n  const id=idOf(q?.id);if(!id)continue;\n  const canonical=idOf(q.bookletCanonicalId)||idOf(q.canonicalId);\n  if(canonical&&canonical!==id)aliases.set(id,canonical);\n }\n const canonical=id=>{if(!idOf(id))return null;const seen=new Map(),chain=[];let next=id;while(aliases.has(next)&&!seen.has(next)){seen.set(next,chain.length);chain.push(next);next=aliases.get(next)}return seen.has(next)?chain.slice(seen.get(next)).sort()[0]:next};\n for(const[id,r]of Object.entries(object(records))){\n  for(const a of array(r?.learning?.attempts))if(a)put(a.at,canonical(a.q));\n  for(const a of array(r?.mcqs)){\n   if(!a||typeof a!=='object')continue;\n   const qid=idOf(a.id)?.match(/^question:\\d{4}-\\d{2}-\\d{2}:(.+)$/)?.[1],at=a.createdAt||a.date;\n   if(qid){put(at,canonical(qid));continue}\n   const n=a.total===undefined?1:a.total;\n   if(!Number.isSafeInteger(n)||n<1||n>10000)continue;\n   const group=bucket(at),key=JSON.stringify([id,idOf(a.id)||a.createdAt||a.date]);\n   if(group)group.aggregates.set(key,Math.max(group.aggregates.get(key)||0,n));\n  }\n }\n for(const[id,a]of Object.entries(object(practice?.booklet)))if(a&&(a.completed||typeof a.correct==='boolean'))put(a.at,canonical(id));\n for(const s of attempts)if(dateOf(s.finishedAt))for(const[i,q]of array(s.questions).entries()){\n  const answer=s.answers?.[i];\n  if(Number.isInteger(answer)&&answer>=0&&(!Array.isArray(q?.options)||answer<q.options.length))put(s.xp?.answeredAt?.[i]||s.finishedAt,canonical(q?.id));\n }\n return Object.fromEntries([...days].map(([d,v])=>[d,v.questions.size+[...v.aggregates.values()].reduce((a,b)=>a+b,0)]));\n}\nexport function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];const candidates=[...Object.keys(days||{}),...Object.keys(baseline||{}),...Object.keys(questions||{})].filter(d=>valid(d)&&d<=end).sort(),last=Date.parse(end+'T12:00:00Z'),earliest=all&&candidates.length?Date.parse(candidates[0]+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}\n";
const candidate=readFileSync(new URL('../public/activity-metrics.mjs',import.meta.url),'utf8');
function load(source){
 let formatterCount=0;
 const context=vm.createContext({Intl:{DateTimeFormat:function(...args){formatterCount++;return new Intl.DateTimeFormat(...args)}}});
 vm.runInContext(source.replaceAll('export function ','function ')+'\nthis.api={questionHistory,historyDates};',context);
 return {api:context.api,formatters:()=>formatterCount};
}
const day='2026-11-24';
const normalize=x=>JSON.parse(JSON.stringify(x));
function compare(label,method,args){
 const before=load(baseline),after=load(candidate);
 const expected=normalize(before.api[method](...args));
 assert.deepEqual(normalize(after.api[method](...args)),expected);
 const times=(fn)=>{const samples=[];for(let i=0;i<3;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[1]};
 const oldMs=times(()=>before.api[method](...args)),newMs=times(()=>after.api[method](...args));
 console.log(JSON.stringify({label,baselineMedianMs:oldMs,candidateMedianMs:newMs,baselineFormatterConstructions:before.formatters(),candidateFormatterConstructions:after.formatters()}));
 return {before,after};
}
test('A5-001 date formatter reuse preserves local dates and bounds construction',()=>{
 const records={L:{learning:{attempts:Array.from({length:1200},(_,i)=>({q:'q'+i,at:i%2?day+'T22:00:00Z':day+'T10:00:00Z'}))}}};
 const {before,after}=compare('A5-001','questionHistory',[records]);
 assert.equal(before.formatters(),4800);
 assert.equal(after.formatters(),1);
 assert.deepEqual(normalize(after.api.questionHistory(records)),{[day]:600,'2026-11-25':600});
});
test('A5-002 alias memoization preserves terminal IDs, cycles, and per-call invalidation',()=>{
 const questions=Array.from({length:160},(_,i)=>({id:'q'+i,canonicalId:'q'+(i+1)}));
 questions.push({id:'x',canonicalId:'y'},{id:'y',canonicalId:'x'},{id:'0',canonicalId:'x'});
 const records={L:{learning:{attempts:Array.from({length:4000},(_,i)=>({q:i%2?'q'+(i%160):['x','y','0'][i%3],at:day}))}}};
 const practice={mocks:[{snapshot:{questions}}]};
 const {after}=compare('A5-002','questionHistory',[records,practice]);
 assert.deepEqual(normalize(after.api.questionHistory(records,practice)),{[day]:2});
 assert.ok(after.api.questionHistory(records,{})[day]>2);
});
test('A5-003 earliest history date scan preserves range, invalid dates and display mode',()=>{
 const days=Object.fromEntries(Array.from({length:6000},(_,i)=>[new Date(Date.UTC(2010,0,1+i)).toISOString().slice(0,10),1]).reverse());
 days['2026-02-30']=1;days['2099-01-01']=1;
 const {after}=compare('A5-003','historyDates',[day,days,{'2020-01-01':1},{},true]);
 for(const all of [true,false])for(const input of [{}, {'2026-11-01':2,'2026-02-30':1,'2099-01-01':1},days]){
  assert.deepEqual(normalize(after.api.historyDates(day,input,{}, {},all)),normalize(load(baseline).api.historyDates(day,input,{}, {},all)));
 }
 assert.deepEqual(normalize(after.api.historyDates('2026-02-30',days,{},{})),[]);
});
test('Audit 5 register contains exactly 300 contiguous unique candidates',()=>{
 const register=readFileSync(new URL('../docs/audits/AUDIT-5-REGISTER.md',import.meta.url),'utf8');
 const rows=[...register.matchAll(/^\| A5-(\d{3}) \| ([^|]+) \|/gm)];
 assert.equal(rows.length,300);
 assert.equal(new Set(rows.map(r=>r[2].trim())).size,300);
 assert.deepEqual(rows.map(r=>Number(r[1])),Array.from({length:300},(_,i)=>i+1));
});
