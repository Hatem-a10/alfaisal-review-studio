import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';

// Local-only, synthetic D1 workload. Not a production load test or latency guarantee.
const source=readFileSync(new URL('../app/api/progress/route.ts',import.meta.url),'utf8');
const insertSQL='INSERT INTO study_snapshots (user_id, revision, snapshot, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING';
const updateSQL='UPDATE study_snapshots SET snapshot = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?';
function config(){
 return {host:'127.0.0.1',port:0,workers:[{name:'audit5-sync-load',modules:true,
  script:'export default {fetch(){return new Response("Synthetic local D1 only")}}',
  d1Databases:{DB:'audit5-isolated-test'}}]};
}
function sample(id,revision){return JSON.stringify({app:'alfaisal-review-studio',version:2,records:{'REN-P1':{done:{[revision]:id}}}})}
test('A5-110 synthetic simultaneous students preserve account and revision isolation in local D1',async()=>{
 assert.ok(source.includes(insertSQL));assert.ok(source.includes(updateSQL));
 const mf=new Miniflare(config());
 try{
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE study_snapshots (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, snapshot TEXT NOT NULL, updated_at TEXT NOT NULL)').run();
  const users=Array.from({length:24},(_,i)=>'audit5-synthetic-account-'+String(i).padStart(2,'0'));
  const loops=4;
  const started=performance.now();
  const writes=await Promise.all(users.map(async user=>{
   let applied=0;
   for(let revision=0;revision<loops;revision++){
    const at='2026-11-24T12:00:00.000Z',data=sample(user,revision+1);
    const run=revision===0
      ?await db.prepare(insertSQL).bind(user,data,at).run()
      :await db.prepare(updateSQL).bind(data,at,user,revision).run();
    assert.equal(run.meta.changes,1,'no account should lose its own sequential write');
    applied++;
   }
   return {user,applied};
  }));
  const elapsedMs=performance.now()-started;
  assert.equal(writes.reduce((n,x)=>n+x.applied,0),96);
  for(const user of users){
   const row=await db.prepare('SELECT user_id,revision,snapshot FROM study_snapshots WHERE user_id=?').bind(user).first();
   assert.equal(row.user_id,user);assert.equal(row.revision,loops);
   assert.equal(JSON.parse(row.snapshot).records['REN-P1'].done[loops],user);
  }
  const stranger=await db.prepare('SELECT * FROM study_snapshots WHERE user_id=?').bind('unregistered-user').first();
  assert.equal(stranger,null);
  const conflicting=users[0],at='2026-11-24T12:01:00.000Z';
  const [one,two]=await Promise.all([
   db.prepare(updateSQL).bind(sample(conflicting,5),at,conflicting,4).run(),
   db.prepare(updateSQL).bind(sample(conflicting,5),at,conflicting,4).run()
  ]);
  assert.equal(one.meta.changes+two.meta.changes,1,'optimistic revision must reject one concurrent writer');
  assert.equal((await db.prepare('SELECT revision FROM study_snapshots WHERE user_id=?').bind(conflicting).first()).revision,5);
  console.log(JSON.stringify({label:'A5-110 local synthetic D1 concurrency diagnostic',accounts:24,writes:96,conflictingWrites:2,acceptedConflictWrites:1,elapsedMs:Math.round(elapsedMs),throughputOpsPerSec:Math.round(96000/Math.max(elapsedMs,1)),productionLatencyMeasured:false,studentDataTouched:false}));
 }finally{await mf.dispose()}
});
