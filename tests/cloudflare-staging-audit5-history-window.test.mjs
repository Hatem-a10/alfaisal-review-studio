import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="const validDay=d=>typeof d==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;\nlet riyadhFormatter;\nconst dateOf=value=>{\n if(typeof value!=='string'&&typeof value!=='number'||value===''||typeof value==='number'&&!Number.isFinite(value))return null;\n if(typeof value==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return validDay(value)?value:null;\n try{const d=new Date(value);return Number.isFinite(+d)?(riyadhFormatter??=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'})).format(d):null}catch{return null}\n};\nconst array=value=>Array.isArray(value)?value:[];\nconst object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};\nconst idOf=value=>typeof value==='string'&&value.length>0?value:null;\nfunction attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}\n// Unique recorded question identities per day; do not infer unsaved historical attempts.\nexport function questionHistory(records,practice={}){\n const days=new Map(),aliases=new Map(),attempts=attemptsOf(practice),dateKeys=new Map();\n // Keep normalization local to this calculation and cap retained distinct timestamps.\n function dayOf(at){if(dateKeys.has(at))return dateKeys.get(at);const day=dateOf(at);if(day&&dateKeys.size<512)dateKeys.set(at,day);return day}\n function bucket(at){const day=dayOf(at);if(!day)return null;if(!days.has(day))days.set(day,{questions:new Set(),aggregates:new Map()});return days.get(day)}\n function put(at,id){if(idOf(id))bucket(at)?.questions.add(id)}\n for(const s of attempts)for(const q of array(s.questions)){\n  const id=idOf(q?.id);if(!id)continue;\n  const canonical=idOf(q.bookletCanonicalId)||idOf(q.canonicalId);\n  if(canonical&&canonical!==id)aliases.set(id,canonical);\n }\n const resolved=new Map();\n const canonical=id=>{if(!idOf(id))return null;if(!aliases.has(id))return id;if(resolved.has(id))return resolved.get(id);const seen=new Map(),chain=[];let next=id;while(aliases.has(next)&&!seen.has(next)&&!resolved.has(next)){seen.set(next,chain.length);chain.push(next);next=aliases.get(next)}let result;if(resolved.has(next))result=resolved.get(next);else if(seen.has(next)){result=next;for(let i=seen.get(next);i<chain.length;i++)if(chain[i]<result)result=chain[i]}else result=next;for(const key of chain)resolved.set(key,result);return result};\n for(const[id,r]of Object.entries(object(records))){\n  for(const a of array(r?.learning?.attempts))if(a)put(a.at,canonical(a.q));\n  for(const a of array(r?.mcqs)){\n   if(!a||typeof a!=='object')continue;\n   const qid=idOf(a.id)?.match(/^question:\\d{4}-\\d{2}-\\d{2}:(.+)$/)?.[1],at=a.createdAt||a.date;\n   if(qid){put(at,canonical(qid));continue}\n   const n=a.total===undefined?1:a.total;\n   if(!Number.isSafeInteger(n)||n<1||n>10000)continue;\n   const group=bucket(at),key=JSON.stringify([id,idOf(a.id)||a.createdAt||a.date]);\n   if(group)group.aggregates.set(key,Math.max(group.aggregates.get(key)||0,n));\n  }\n }\n for(const[id,a]of Object.entries(object(practice?.booklet)))if(a&&(a.completed||typeof a.correct==='boolean'))put(a.at,canonical(id));\n for(const s of attempts)if(dayOf(s.finishedAt))for(const[i,q]of array(s.questions).entries()){\n  const answer=s.answers?.[i];\n  if(Number.isInteger(answer)&&answer>=0&&(!Array.isArray(q?.options)||answer<q.options.length))put(s.xp?.answeredAt?.[i]||s.finishedAt,canonical(q?.id));\n }\n const history={};\n for(const [day,group] of days){let total=0;for(const count of group.aggregates.values())total+=count;history[day]=group.questions.size+total}\n return history;\n}\nexport function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];let first=null;if(all)for(const source of [days,baseline,questions])for(const d of Object.keys(source||{}))if(d<=end&&(first===null||d<first)&&valid(d))first=d;const last=Date.parse(end+'T12:00:00Z'),earliest=first!==null?Date.parse(first+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}\n";
const candidate=readFileSync(new URL('../public/activity-metrics.mjs',import.meta.url),'utf8');
const get=source=>vm.runInNewContext(source.replaceAll('export function','function')+';questionHistory');
const a=get(baseline),b=get(candidate);
const since='2026-09-02';
function fixture(){
 const records={
  'MOL-1':{learning:{attempts:[{q:'alias-1',at:'2026-08-03T00:00:00Z'},{q:'alias-1',at:'2026-11-20T10:00:00Z'},{q:'MOL-Q2',at:'2026-09-03T06:00:00Z'}]},mcqs:[{id:'MOL-Q3',total:3,correct:2,createdAt:'2026-05-01T00:00:00Z'},{id:'question:2026-11-20:alias-1',total:1,createdAt:'2026-11-20T09:00:00Z'}]},
  'REN-A1':{mcqs:[{id:'summary-a',total:25,createdAt:'2026-05-01T10:00:00Z'},{id:'summary-b',total:8,date:'2026-11-20',createdAt:'2026-11-20T12:00:00Z'}]}
 };
 const oldMock={id:'a',questions:[{id:'alias-1',bookletCanonicalId:'root-question',options:['A','B']}],answers:{0:0},finishedAt:'2026-05-01T11:00:00Z'};
 const recentMock={id:'b',questions:[{id:'alias-1',options:['A','B']}],answers:{0:1},finishedAt:'2026-11-20T12:00:00Z'};
 const oldWithNewAnswer={id:'c',questions:[{id:'MOL-Q4',options:['A','B']}],answers:{0:1},finishedAt:'2026-05-01T11:00:00Z',xp:{answeredAt:{0:'2026-11-20T10:00:00Z'}}};
 return {records,practice:{mocks:[{snapshot:oldMock},{snapshot:recentMock},{snapshot:oldWithNewAnswer}],booklet:{'root-question':{completed:true,correct:true,at:'2026-11-20T15:00:00Z'}}}};
}
function norm=x=>JSON.parse(JSON.stringify(x));
test('A5-004 bounded recent history exactly matches the all-time result inside window',()=>{
 const {records,practice}=fixture(),full=a(records,practice);
 const recent=b(records,practice,since);
 assert.deepEqual(norm(recent),norm(Object.fromEntries(Object.entries(full).filter(([d])=>d>=since))));
 assert.deepEqual(norm(b(records,practice)),norm(full));
 assert.ok(!Object.hasOwn(recent,'2026-05-01'));
 assert.equal(recent['2026-11-20'],full['2026-11-20']);
});
test('A5-004 recent activity view passes a bounded window only in 12-week mode',()=>{
 const source=readFileSync(new URL('../public/phase2-runtime.mjs',import.meta.url),'utf8');
 assert.match(source,/activityData\(options,activityAll\?null:add\(date,-83\)\)/);
 assert.match(source,/questionHistory\(state,options.phase2Practice,since\)/);
});
function median(fn){fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]}
test('A5-004 old mock answer loops are bypassed without losing alias resolution',()=>{
 const questions=Array.from({length:25},(_,i)=>({id:'q'+i,bookletCanonicalId:i%2?'root'+i:undefined,options:['a','b']}));
 const mocks=Array.from({length:1200},(_,i)=>({snapshot:{id:'s'+i,finishedAt:'2026-04-01T00:00:00Z',answers:Object.fromEntries(questions.map((q,j)=>[j,j%2])),questions}}));
 mocks.push({snapshot:{id:'new',finishedAt:'2026-11-20T00:00:00Z',answers:{0:1},questions}});
 const practice={mocks};const full=a({},practice),recent=()=>b({},practice,since);
 assert.deepEqual(norm(recent()),norm(Object.fromEntries(Object.entries(full).filter(([d])=>d>=since))));
 console.log(JSON.stringify({label:'A5-004 recent question history',baselineMedianMs:median(()=>a({},practice)),candidateMedianMs:median(recent),mocks:mocks.length,questionsPerOldMock:questions.length}));
});
