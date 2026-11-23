import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {allowProductionWrite,productionPolicy,mayUseProduction,isProductionDatabase} from '../lib/production-access.mjs';
import {candidateConfig} from '../scripts/prepare-production-config.mjs';

const env={
 REVIEW_STUDIO_DEPLOYMENT:'production',
 REVIEW_STUDIO_ACCESS:'restricted',
 REVIEW_STUDIO_CLERK_OWNER_SUB:'user_Owner',
 REVIEW_STUDIO_OWNER_REAUTH:'1',
 REVIEW_STUDIO_PANEL_PASSWORD_HASH:'pbkdf2-sha256$100000$'+'a'.repeat(32)+'$'+'b'.repeat(64),
};
const config=JSON.parse(readFileSync(new URL('../wrangler.production.jsonc',import.meta.url)));
const staging=JSON.parse(readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url)));

test('restricted production grants access only to verified immutable subjects and fails closed on incomplete policy',()=>{
 const policy=productionPolicy({...env,REVIEW_STUDIO_REVIEWER_SUBS:'["user_Reviewer"]'});
 assert.equal(mayUseProduction(policy,{subject:'user_Owner'}),true);
 assert.equal(mayUseProduction(policy,{subject:'user_Reviewer'}),true);
 assert.equal(mayUseProduction(policy,{subject:'user_Different',email:'owner@example.org',role:'owner'}),false);
 assert.equal(mayUseProduction(policy,null),false);
 for(const values of [{REVIEW_STUDIO_ACCESS:''},{REVIEW_STUDIO_OWNER_REAUTH:'0'},
  {REVIEW_STUDIO_REVIEWER_SUBS:'["name@example.org"]'},{REVIEW_STUDIO_CLERK_OWNER_SUB:''},{REVIEW_STUDIO_PANEL_PASSWORD_HASH:''}]){
  assert.equal(productionPolicy({...env,...values}),null);
 }
 assert.equal(mayUseProduction(productionPolicy({...env,REVIEW_STUDIO_ACCESS:'open'}),{subject:'user_Different'}),true);
});

test('the complete fresh schema is empty and only a designated database passes production verification',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const files=['drizzle/0000_huge_gladiator.sql','drizzle/0001_purple_norman_osborn.sql',
  'staging/schema.sql','staging/managed-accounts.sql','staging/admin-control.sql',
  'staging/admin-academics.sql','staging/admin-content.sql','staging/admin-resources.sql'];
 for(const file of files)db.exec(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
 const binding={prepare(sql){return {first:async()=>db.prepare(sql).get()}}};
 assert.equal(await isProductionDatabase(binding),false);
 for(const table of ['review_accounts','study_snapshots','study_materials','admin_shared_resources','control_students','control_audit']){
  assert.equal(db.prepare('SELECT count(*) AS total FROM '+table).get().total,0,table);
 }
 db.exec(readFileSync(new URL('../production/identity.sql',import.meta.url),'utf8'));
 assert.equal(await isProductionDatabase(binding),true);
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('prepare production targets only the designated resources with public routes and preview disabled',()=>{
 const id='12345678-1234-1234-1234-123456789abc';
 const prepared=candidateConfig(config,id,'restricted');
 assert.equal(prepared.d1_databases[0].database_id,id);
 assert.equal(prepared.vars.REVIEW_STUDIO_ACCESS,'restricted');
 assert.equal(candidateConfig(config,id,'open').vars.REVIEW_STUDIO_ACCESS,'open');
 assert.equal(config.vars.REVIEW_STUDIO_ACCESS,'restricted');
 for(const access of [undefined,'','public','OPEN'])assert.throws(()=>candidateConfig(config,id,access),/access mode/);
 assert.equal(prepared.r2_buckets[0].bucket_name,'review-studio-production');
 assert.equal(prepared.workers_dev,false);
 for(const target of ['',staging.d1_databases[0].database_id,config.d1_databases[0].database_id]){
  assert.throws(()=>candidateConfig(config,target,'open'),/verified production/);
 }
 for(const wrong of [staging,{...config,workers_dev:true},{...config,routes:['*']},
  {...config,vars:{...config.vars,REVIEW_STUDIO_ACCESS:'open'}},
  {...config,r2_buckets:staging.r2_buckets}]){
  assert.throws(()=>candidateConfig(wrong,id,'open'),/isolated/);
 }
});

test('production write caps are scoped to the verified account and reset without affecting reads',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(readFileSync(new URL('../staging/admin-control.sql',import.meta.url),'utf8'));
 const binding={prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args)}}}}};
 const now=86400000;
 for(let count=0;count<20;count++)assert.equal(await allowProductionWrite(binding,'student-a','api/decks','POST',now),true);
 assert.equal(await allowProductionWrite(binding,'student-a','api/materials','POST',now),false);
 assert.equal(await allowProductionWrite(binding,'student-a','api/decks','GET',now),true);
 assert.equal(await allowProductionWrite(binding,'student-a','api/progress','PATCH',now),true);
 assert.equal(await allowProductionWrite(binding,'student-b','api/materials','POST',now),true);
 assert.equal(await allowProductionWrite(binding,'student-a','api/decks','POST',now+86400000),true);
});
