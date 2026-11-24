import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import vm from 'node:vm';

// Frozen pre-batch source, blob 3cba0c79c42917be69b5af45fe4c8b72659565b7; used only by tests.
const baseline="const validDay=d=>typeof d==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;\nlet riyadhFormatter;\nconst dateOf=value=>{\n if(typeof value!=='string'&&typeof value!=='number'||value===''||typeof value==='number'&&!Number.isFinite(value))return null;\n if(typeof value==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return validDay(value)?value:null;\n try{const d=new Date(value);return Number.isFinite(+d)?(riyadhFormatter??=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'})).format(d):null}catch{return null}\n};\nconst array=value=>Array.isArray(value)?value:[];\nconst object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};\nconst idOf=value=>typeof value==='string'&&value.length>0?value:null;\nfunction attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}\n// Unique recorded question identities per day; do not infer unsaved historical attempts.\nexport function questionHistory(records,practice={}){\n const days=new Map(),aliases=new Map(),attempts=attemptsOf(practice);\n function bucket(at){const day=dateOf(at);if(!day)return null;if(!days.has(day))days.set(day,{questions:new Set(),aggregates:new Map()});return days.get(day)}\n function put(at,id){if(idOf(id))bucket(at)?.questions.add(id)}\n for(const s of attempts)for(const q of array(s.questions)){\n  const id=idOf(q?.id);if(!id)continue;\n  const canonical=idOf(q.bookletCanonicalId)||idOf(q.canonicalId);\n  if(canonical&&canonical!==id)aliases.set(id,canonical);\n }\n const resolved=new Map();\n const canonical=id=>{if(!idOf(id))return null;if(!aliases.has(id))return id;if(resolved.has(id))return resolved.get(id);const seen=new Map(),chain=[];let next=id;while(aliases.has(next)&&!seen.has(next)&&!resolved.has(next)){seen.set(next,chain.length);chain.push(next);next=aliases.get(next)}let result;if(resolved.has(next))result=resolved.get(next);else if(seen.has(next)){result=next;for(let i=seen.get(next);i<chain.length;i++)if(chain[i]<result)result=chain[i]}else result=next;for(const key of chain)resolved.set(key,result);return result};\n for(const[id,r]of Object.entries(object(records))){\n  for(const a of array(r?.learning?.attempts))if(a)put(a.at,canonical(a.q));\n  for(const a of array(r?.mcqs)){\n   if(!a||typeof a!=='object')continue;\n   const qid=idOf(a.id)?.match(/^question:\\d{4}-\\d{2}-\\d{2}:(.+)$/)?.[1],at=a.createdAt||a.date;\n   if(qid){put(at,canonical(qid));continue}\n   const n=a.total===undefined?1:a.total;\n   if(!Number.isSafeInteger(n)||n<1||n>10000)continue;\n   const group=bucket(at),key=JSON.stringify([id,idOf(a.id)||a.createdAt||a.date]);\n   if(group)group.aggregates.set(key,Math.max(group.aggregates.get(key)||0,n));\n  }\n }\n for(const[id,a]of Object.entries(object(practice?.booklet)))if(a&&(a.completed||typeof a.correct==='boolean'))put(a.at,canonical(id));\n for(const s of attempts)if(dateOf(s.finishedAt))for(const[i,q]of array(s.questions).entries()){\n  const answer=s.answers?.[i];\n  if(Number.isInteger(answer)&&answer>=0&&(!Array.isArray(q?.options)||answer<q.options.length))put(s.xp?.answeredAt?.[i]||s.finishedAt,canonical(q?.id));\n }\n return Object.fromEntries([...days].map(([d,v])=>[d,v.questions.size+[...v.aggregates.values()].reduce((a,b)=>a+b,0)]));\n}\nexport function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];let first=null;if(all)for(const source of [days,baseline,questions])for(const d of Object.keys(source||{}))if(d<=end&&(first===null||d<first)&&valid(d))first=d;const last=Date.parse(end+'T12:00:00Z'),earliest=first!==null?Date.parse(first+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}\n";
const candidate=readFileSync(new URL('../public/activity-metrics.mjs',import.meta.url),'utf8');
const normalize=x=>JSON.parse(JSON.stringify(x));
function load(source){
 let formats=0;
 const context=vm.createContext({Intl:{DateTimeFormat:function(...args){
  const formatter=new Intl.DateTimeFormat(...args);
  return {format(value){formats++;return formatter.format(value)}};
 }}});
 vm.runInContext(source.replaceAll('export function ','function ')+'\nthis.api={questionHistory};',context);
 return {run:context.api.questionHistory,formats:()=>formats};
}
function median(fn){
 fn();const samples=[];
 for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}
 return samples.sort((a,b)=>a-b)[3];
}
test('A5-008 repeated date normalization preserves Riyadh boundaries, counts and per-call isolation',()=>{
 const before=load(baseline),after=load(candidate);
 const records={L:{learning:{attempts:Array.from({length:4000},(_,i)=>({q:'q'+i,at:i%2?'2026-11-24T22:00:00Z':'2026-11-24T10:00:00Z'}))}}};
 assert.deepEqual(normalize(after.run(records)),normalize(before.run(records)));
 assert.deepEqual(normalize(after.run(records)),{'2026-11-24':2000,'2026-11-25':2000});
 assert.equal(before.formats(),4000);assert.equal(after.formats(),4);
 console.log(JSON.stringify({label:'A5-008 repeated timestamps',baselineMedianMs:median(()=>before.run(records)),candidateMedianMs:median(()=>after.run(records)),baselineFormatsPerCall:4000,candidateFormatsPerCall:2}));
 const many={L:{learning:{attempts:Array.from({length:700},(_,i)=>({q:'q'+i,at:Date.UTC(2026,10,24,0,0,i)}))}}};
 assert.deepEqual(normalize(after.run(many)),normalize(before.run(many)));
 const mixed={L:{learning:{attempts:[{q:'a',at:'2026-02-30'},{q:'b',at:''},{q:'c',at:NaN},{q:'d',at:0},{q:'e',at:'1970-01-01'},{q:'f',at:null},{q:'g',at:'2026-11-24T22:00:00Z'}]}}};
 assert.deepEqual(normalize(after.run(mixed)),normalize(before.run(mixed)));
});
test('A5-005 direct aggregation preserves max-per-key, invalid totals, day order and unique identities',()=>{
 const before=load(baseline),after=load(candidate);
 const day='2026-11-24',earlier='2026-11-23';
 const records={L:{learning:{attempts:[{q:'q1',at:day},{q:'q1',at:day}]},mcqs:[
  {id:'same',date:day,total:3},{id:'same',date:day,total:5},
  {id:'same',date:earlier,total:2},{id:'default',date:day},
  {id:'invalid',date:day,total:-1},{id:'question:'+day+':q1',date:day,total:30},
 ]},M:{mcqs:[{id:'same',date:day,total:2}]}};
 const expected=normalize(before.run(records));
 assert.deepEqual(normalize(after.run(records)),expected);
 assert.deepEqual(expected,{[day]:9,[earlier]:2});
 assert.deepEqual(Object.keys(after.run(records)),Object.keys(before.run(records)));
 const large={L:{mcqs:Array.from({length:10000},(_,i)=>({id:'aggregate-'+i,date:day,total:(i%10)+1}))}};
 assert.deepEqual(normalize(after.run(large)),normalize(before.run(large)));
 // Combined workload includes date reuse; do not attribute the timing solely to aggregation.
 console.log(JSON.stringify({label:'A5-005/A5-008 combined aggregate workload',baselineMedianMs:median(()=>before.run(large)),candidateMedianMs:median(()=>after.run(large)),baselineAggregateArrayEntries:10000,candidateAggregateArrayEntries:0}));
});
