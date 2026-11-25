import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/study-vault.js',import.meta.url),'utf8');
const prefix='alfaisal-review-studio-v1',metaKey=prefix+'-vault-meta-v1',old='2026-11-21T12:00:00Z',recent='2026-11-22T12:00:00Z';
function vault(initial={}){
 class Storage{constructor(){this.values=new Map(Object.entries(initial))}getItem(k){return this.values.get(k)??null}setItem(k,v){this.values.set(k,String(v))}removeItem(k){this.values.delete(k)}}
 const localStorage=new Storage(),api=runInNewContext(source+';StudyVault',{Storage,localStorage,window:{dispatchEvent(){}},CustomEvent:class{}});
 return {api,localStorage};
}
const wrap=(name,value,at=old)=>({version:1,stores:{[name]:{at,value}}});
test('corrupt metadata does not break saving or create invalid timestamps in otherwise readable backups',()=>{
 for(const meta of ['null','[]','"invalid"','{"options":"bad","constructor":"2026-11-21"}']){
  const {api,localStorage}=vault({[metaKey]:meta,[prefix+'-study-options-v1']:'{"font":20}'});
  assert.equal(api.snapshot().stores.options.at,'2000-01-01T00:00:00.000Z');
  api.set('options',{font:24});assert.equal(api.read('options').font,24);
  assert.ok(Number.isFinite(Date.parse(api.snapshot().stores.options.at)));
  assert.equal(localStorage.getItem(prefix+'-study-options-v1'),'{"font":24}');
 }
});
test('unknown inherited store names and undefined values cannot create invalid storage keys',()=>{
 const {api,localStorage}=vault();for(const key of ['constructor','__proto__','toString']){assert.throws(()=>api.set(key,{}),/Unknown/);assert.throws(()=>api.read(key),/Unknown/)}
 assert.throws(()=>api.set('options',undefined),/Invalid/);assert.equal(localStorage.getItem(prefix+'-study-options-v1'),null);
});
test('missing envelope value is not accepted as a deletion and unsafe nested fields are rejected',()=>{
 const {api}=vault();assert.throws(()=>api.valid(false),/Invalid/);assert.throws(()=>api.valid({version:1,stores:{options:{at:old}}}),/Invalid/);
 assert.throws(()=>api.valid(wrap('options',JSON.parse('{"nested":{"__proto__":{}}}'))),/Unsafe/);
 let nested={};for(let i=0;i<70;i++)nested={next:nested};assert.throws(()=>api.valid(wrap('options',nested)),/deeply/);
 assert.equal(api.valid(wrap('options',null)).stores.options.value,null);
 const shared={label:'same'};assert.doesNotThrow(()=>api.valid(wrap('options',{a:shared,b:shared,optional:undefined})));
});
const question={id:'q',question:'Question?',lectureIds:['MOL-1'],options:['yes','no'],answer:0,explanation:'Explanation',reasons:['yes','no']};
test('a full wrong-bank clear prevents timestamp-less legacy entries from reappearing',()=>{
 const {api}=vault(),entry={question,choice:1};
 const a=wrap('wrongBank',{entries:[entry],exams:['old']});
 const b=wrap('wrongBank',{entries:[],exams:['old'],clearedAt:recent},recent);
 assert.equal(api.merge(a,b).stores.wrongBank.value.entries.length,0);
 assert.equal(api.merge(a,wrap('wrongBank',{entries:[],exams:[]})).stores.wrongBank.value.entries.length,1);
});
test('a submitted mock and submitted original are preserved over later unfinished copies of the same attempt',()=>{
 const {api}=vault(),mock={id:'mock',questions:[question],answers:{0:0},flags:{},deadline:1,finishedAt:old};
 const m=api.merge(wrap('mock',mock),wrap('mock',{...mock,finishedAt:null,answers:{0:1}},recent)).stores.mock.value;
 assert.equal(m.finishedAt,old);assert.equal(m.answers[0],0);
 const original={setId:'a',startedAt:old,finishedAt:old,updatedAt:old,ids:['q'],answers:{q:0}};
 const o=api.merge(wrap('originals',{a:original}),wrap('originals',{a:{...original,finishedAt:null,updatedAt:recent,answers:{q:1}}},recent)).stores.originals.value.a;
 assert.equal(o.finishedAt,old);assert.equal(o.answers.q,0);
});
test('visual result merge follows result timestamp instead of unrelated companion-store save time',()=>{
 const {api}=vault(),a=wrap('visual',{exercises:{},results:{figure:{correct:2,total:2,at:recent}}},old),b=wrap('visual',{exercises:{other:[]},results:{figure:{correct:0,total:2,at:old}}},recent);
 const m=api.merge(a,b).stores.visual.value;assert.equal(m.results.figure.correct,2);assert.ok(Array.isArray(m.exercises.other));
});

test('guided repair exports corrupt bytes and resets only the selected store after verified device backup',async()=>{
 const raw='{bad json',damaged=prefix+'-wrong-bank-v1',other=prefix+'-study-options-v1',accountKey=prefix+'-account';
 const data=new Map([[damaged,raw],[other,'{"font":20}'],[accountKey,'account-a']]);
 class Storage{getItem(k){return data.get(k)??null}setItem(k,v){data.set(k,String(v))}removeItem(k){data.delete(k)}}
 const backups=new Map(),batches=[],localStorage=new Storage();let failBackup=true,failFlush=false;
 const device={available:true,async backup(k,v){if(failBackup)throw Error('Backup unavailable');backups.set(k,v)},stageBatch(rows){batches.push(rows);for(const [k,v] of rows)v===null?data.delete(k):data.set(k,v)},async flush(){if(failFlush){failFlush=false;throw Error('Disk failure')}}};
 let scheduled=0;
 const api=runInNewContext(source+';StudyVault',{Storage,localStorage,window:{ReviewDevice:device,dispatchEvent(){}},CustomEvent:class{},crypto:{randomUUID:()=>String(backups.size)},scheduleSync:()=>scheduled++});
 assert.equal(api.inspectDamaged()[0].raw,raw);
 await assert.rejects(api.resetDamaged('wrongBank',raw),/Backup unavailable/);assert.equal(data.get(damaged),raw);assert.equal(batches.length,0);
 failBackup=false;failFlush=true;
 await assert.rejects(api.resetDamaged('wrongBank',raw),/not confirmed/);assert.equal(data.get(damaged),raw);assert.equal(data.get(other),'{"font":20}');
 assert.ok(backups.size);assert.equal(scheduled,0);
 await assert.rejects(api.resetDamaged('wrongBank','different bytes'),/changed/);
 assert.equal(await api.resetDamaged('wrongBank',raw),true);
 assert.equal(data.has(damaged),false);assert.equal(data.get(other),'{"font":20}');
 assert.equal(api.inspectDamaged().length,0);assert.equal(api.snapshot().stores.wrongBank.value,null);assert.equal(scheduled,1);
 assert.ok([...backups.keys()].every(k=>k.startsWith('account-a|damaged:wrongBank:')));
 assert.ok([...backups.values()].every(v=>JSON.parse(v).raw===raw));
});
