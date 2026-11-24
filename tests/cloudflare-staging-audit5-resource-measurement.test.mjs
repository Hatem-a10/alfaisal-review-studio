import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {IndexedDBWriteMeter,D1ReadMeter,R2TransferMeter,syntheticAcademicFixture} from '../scripts/audit5-measurements.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('A5-289 stable seeded synthetic records are bounded and reproducible',()=>{
 const a=syntheticAcademicFixture(20261124,{accounts:17,materials:500,edits:150});
 const b=syntheticAcademicFixture(20261124,{accounts:17,materials:500,edits:150});
 const c=syntheticAcademicFixture(20261125,{accounts:17,materials:500,edits:150});
 assert.deepEqual(a,b);assert.notDeepEqual(a.records,c.records);
 assert.equal(a.records.length,500);assert.equal(a.changes.length,150);
 assert.ok(a.records.every(r=>a.users.includes(r.user_id)));
 assert.ok(a.records.every(r=>r.id.startsWith('test-asset-')));
 assert.throws(()=>syntheticAcademicFixture(0));
 assert.throws(()=>syntheticAcademicFixture(1,{accounts:2,materials:100001}));
 console.log(JSON.stringify({label:'A5-289 deterministic academic fixture',seed:a.seed,accounts:a.users.length,materialRows:a.records.length,editCount:a.changes.length}));
});
function simulatedDeviceDatabase(meter){
 const stores=new Map();
 const db={createObjectStore(name){stores.set(name,new Map())},transaction(name,mode){
  if(mode==='readwrite')meter.transaction();
  const data=stores.get(name),tx={error:null};let pending=0,failed=false;
  const request=action=>{const r={};pending++;queueMicrotask(()=>{try{r.result=action();r.onsuccess?.()}catch(error){failed=true;tx.error=r.error=error;r.onerror?.();tx.onerror?.()}finally{if(--pending===0&&!failed)queueMicrotask(()=>tx.oncomplete?.())}});return r};
  tx.objectStore=()=>({
   get:key=>request(()=>data.get(key)),
   getAllKeys:()=>request(()=>[...data.keys()]),
   getAll:()=>request(()=>[...data.values()]),
   put:(value,key)=>request(()=>{if(mode==='readwrite'&&name==='values')meter.put(value);data.set(key,value);return key}),
   delete:key=>request(()=>{if(mode==='readwrite'&&name==='values')meter.remove();return data.delete(key)})
  });
  return tx;
 }};
 return {stores,indexedDB:{open(){const r={result:db};queueMicrotask(()=>{if(!stores.size)r.onupgradeneeded?.();r.onsuccess?.()});return r}}};
}
test('A5-283 counts actual IndexedDB transactions from the production device bootstrap',async()=>{
 const source=read('public/device-storage.js');
 assert.match(source,/function drain\(\)\{if\(!db\)return;chain=chain/);
 const meter=new IndexedDBWriteMeter(),database=simulatedDeviceDatabase(meter);
 const backing=new Map();class Storage{get length(){return backing.size}key(i){return [...backing.keys()][i]??null}getItem(k){return backing.get(k)??null}setItem(k,v){backing.set(String(k),String(v))}removeItem(k){backing.delete(k)}}
 const storage=new Storage();
 const context={Storage,localStorage:storage,indexedDB:database.indexedDB,location:{reload(){}},document:{querySelectorAll:()=>[],getElementById:()=>null},CustomEvent:class{constructor(type,x){this.type=type;this.detail=x?.detail}},dispatchEvent(){}};
 context.window=context;await vm.runInNewContext(source,context);
 assert.equal(context.ReviewDevice?.available,true);
 const fixture=syntheticAcademicFixture(20261124,{accounts:4,materials:0,edits:150});
 const before=meter.summary();const changes=fixture.changes.map((row,i)=>['alfaisal-review-studio-v1-test-'+i,'x'.repeat(row.size)]);
 meter.edit(changes.length);
 context.ReviewDevice.stageBatch(changes);
 await context.ReviewDevice.flush();
 const after=meter.summary();const diff={transactions:after.transactions-before.transactions,writeOperations:after.writeOperations-before.writeOperations,bytes:after.storedBytes-before.storedBytes};
 assert.equal(diff.transactions,1);assert.equal(diff.writeOperations,150);
 assert.ok(diff.bytes>0);assert.equal(meter.summary().edits,150);
 console.log(JSON.stringify({label:'A5-283 synthetic device write amplification',edits:150,...diff,transactionsPerEdit:diff.transactions/150,writeOperationsPerEdit:diff.writeOperations/150}));
});
test('A5-284 reads D1 meta.rows_read rather than assuming returned rows equal rows scanned',()=>{
 const meter=new D1ReadMeter(),fixture=syntheticAcademicFixture(20261124,{accounts:8,materials:250,edits:0});
 const user=fixture.users[3],rows=fixture.records.filter(r=>r.user_id===user&&r.lecture_id!=='ANKI');
 const query=read('app/api/materials/route.ts'),sql="SELECT id, name, lecture_id AS lectureId, mime, bytes, page_count AS pageCount, created_at AS createdAt FROM study_materials WHERE user_id = ? AND lecture_id != 'ANKI' ORDER BY created_at DESC";
 assert.ok(query.includes(sql));
 assert.equal(meter.record({results:rows,meta:{rows_read:250,rows_written:0}}).results,rows);
 meter.record({results:[{revision:2}],meta:{rows_read:1,rows_written:0}});
 meter.record({results:[],meta:{rows_read:0,rows_written:0}});
 const r=meter.summary();assert.equal(r.rowsRead,251);assert.equal(r.rowsReturned,rows.length+1);assert.equal(r.calls,3);assert.equal(r.unknownReads,0);
 meter.record({results:[]});assert.equal(meter.summary().unknownReads,1);
 console.log(JSON.stringify({label:'A5-284 D1 rows-read collector (synthetic provider metadata)',syntheticTotalRows:250,accountRows:rows.length,rowsRead:r.rowsRead,rowsReturned:r.rowsReturned,calls:r.calls}));
});
test('A5-285 measures actual full and ranged R2 response bytes using the authorized asset handler',async()=>{
 const asset={path:'materials/synthetic.pdf',size:1048576,sha:'a'.repeat(64)};
 const s=read('lib/site-assets.ts'),out=ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};new Function('require','module','exports',out)(name=>({
  './site-assets-manifest':{SITE_ASSETS:[asset]},'../public/renal-materials.json':[],'./active-booklet-assets.json':[],
  './renal-booklet-asset.json':asset,'../public/mol-study-assets.json':{booklet:asset,assessments:asset,sources:[]},
  './renal-assessment-assets.json':[]
 })[name],module,module.exports);
 const bucket={head:async()=>({size:asset.size}),get:async(_key,options)=>({size:asset.size,body:new Uint8Array(options?.range?.length??asset.size)})};
 const meter=new R2TransferMeter();
 const full=await module.exports.serveAsset(new Request('https://example.test/'+asset.path),bucket,asset.path);
 const fullBytes=(await full.arrayBuffer()).byteLength;meter.record('pdf',fullBytes);
 const ranged=await module.exports.serveAsset(new Request('https://example.test/'+asset.path,{headers:{Range:'bytes=0-65535'}}),bucket,asset.path);
 const rangeBytes=(await ranged.arrayBuffer()).byteLength;meter.record('pdf',rangeBytes);
 assert.equal(full.status,200);assert.equal(ranged.status,206);
 assert.equal(fullBytes,1048576);assert.equal(rangeBytes,65536);
 assert.equal(meter.summary().bytes,1114112);assert.equal(meter.summary().byClass.pdf.requests,2);
 assert.throws(()=>meter.record('private-account-id',1));
 console.log(JSON.stringify({label:'A5-285 synthetic PDF resource journey',fullResponseBytes:fullBytes,rangeResponseBytes:rangeBytes,rangeSavingsPercent:Math.round((1-rangeBytes/fullBytes)*100),accountIdentifiersRecorded:false}));
});
