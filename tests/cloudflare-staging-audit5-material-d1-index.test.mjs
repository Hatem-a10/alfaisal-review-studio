import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

const migration=readFileSync(new URL('../drizzle/0002_materials_account_created_idx.sql',import.meta.url),'utf8');
const schema=readFileSync(new URL('../db/schema.ts',import.meta.url),'utf8');
const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(readFileSync(new URL('../drizzle/meta/0002_snapshot.json',import.meta.url),'utf8'));
const create=()=>{const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE study_materials (
 id text PRIMARY KEY NOT NULL,user_id text NOT NULL,name text NOT NULL,lecture_id text NOT NULL,
 mime text NOT NULL,bytes integer NOT NULL,page_count integer NOT NULL,created_at text NOT NULL
)`);return db};
const fill=(db,count=16000)=>{const insert=db.prepare('INSERT INTO study_materials VALUES (?,?,?,?,?,?,?,?)');db.exec('BEGIN');for(let i=0;i<count;i++)insert.run('asset-'+i,'synthetic-'+i%48,'document-'+i,i%5===0?'ANKI':'REN-P'+i%17,'application/pdf',1000+i%900,20,'2026-11-'+String(i%23+1).padStart(2,'0')+'T12:00:00Z');db.exec('COMMIT')};
const statements=[
 ["material list","SELECT id,name,lecture_id,mime,bytes,page_count,created_at FROM study_materials WHERE user_id=? AND lecture_id!='ANKI' ORDER BY created_at DESC",['synthetic-3']],
 ["deck list","SELECT id,name,bytes,page_count,created_at FROM study_materials WHERE user_id=? AND lecture_id='ANKI' ORDER BY created_at DESC",['synthetic-3']],
 ["quota","SELECT COALESCE(SUM(bytes),0) AS bytes FROM study_materials WHERE user_id=?",['synthetic-3']]
];
const explain=(db,sql,args)=>db.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(row=>row.detail).join(' | ');
test('A5-051 query plans identify full scans and temp sorting in old D1 metadata list',()=>{
 const db=create();try{fill(db);
  const plans=statements.map(([name,sql,args])=>({name,plan:explain(db,sql,args)}));
  assert.ok(plans.every(x=>x.plan.includes('SCAN study_materials')));
  assert.match(plans[0].plan,/USE TEMP B-TREE FOR ORDER BY/);
  console.log(JSON.stringify({label:'A5-051 baseline synthetic D1 query plan',plans}));
 }finally{db.close()}
});
test('A5-052/A5-060 account index removes full scans and sorting for the exact hot query shapes',()=>{
 const db=create();try{fill(db);const old=statements.map(([,sql,args])=>db.prepare(sql).all(...args));
  const bytesBefore=db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
  db.exec(migration);db.exec(migration);const current=statements.map(([,sql,args])=>db.prepare(sql).all(...args));
  assert.deepEqual(current,old);
  for(const [name,sql,args] of statements){const plan=explain(db,sql,args);assert.match(plan,/SEARCH study_materials USING INDEX study_materials_user_created_idx/);
   if(name!=='quota')assert.doesNotMatch(plan,/USE TEMP B-TREE/);
  }
  const multi=db.prepare("SELECT DISTINCT user_id FROM study_materials WHERE user_id=?");
  assert.deepEqual(multi.all('synthetic-3').map(x=>x.user_id),['synthetic-3']);
  const bytesAfter=db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
  assert.ok(bytesAfter>=bytesBefore);
  assert.ok((bytesAfter-bytesBefore)/bytesBefore<.45,'index cost is bounded on representative synthetic data');
  console.log(JSON.stringify({label:'A5-052/060 indexed account D1 lookup',syntheticRows:16000,plan:explain(db,statements[0][1],statements[0][2]),indexBytes:bytesAfter-bytesBefore,tableBytesBefore:bytesBefore}));
 }finally{db.close()}
});
test('A5-297 index storage cost is explicit, reproducible and reversible',()=>{
 const db=create();try{fill(db,6000);
  const size=()=>db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
  const prior=size();db.exec(migration);const added=size()-prior;assert.ok(added>0);
  const names=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").all('study_materials_user_created_idx');
  assert.equal(names.length,1);
  assert.equal(snapshot.tables.study_materials.indexes.study_materials_user_created_idx.name,names[0].name);
  assert.ok(journal.entries.some(x=>x.tag==='0002_materials_account_created_idx'));
  assert.match(schema,/index\('study_materials_user_created_idx'\)/);
  assert.ok(added<prior*.5);
  db.exec('DROP INDEX study_materials_user_created_idx');
  assert.doesNotMatch(explain(db,statements[0][1],statements[0][2]),/USING INDEX study_materials_user_created_idx/);
  console.log(JSON.stringify({label:'A5-297 material-index tradeoff',syntheticRows:6000,bytesBefore:prior,indexBytes:added,overheadRatio:Math.round(added/prior*1000)/1000}));
 }finally{db.close()}
});
