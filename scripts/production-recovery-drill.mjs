import assert from 'node:assert/strict';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare} from 'miniflare';

const schema=[
 'drizzle/0000_huge_gladiator.sql','drizzle/0001_purple_norman_osborn.sql','staging/schema.sql',
 'staging/managed-accounts.sql','staging/admin-control.sql','staging/admin-academics.sql','staging/admin-content.sql',
 'staging/admin-resources.sql','production/identity.sql',
];
const tables={
 review_accounts:['id','email','created_at','last_seen_at'],
 study_snapshots:['user_id','revision','snapshot','updated_at'],
 study_materials:['id','user_id','name','lecture_id','mime','bytes','page_count','created_at'],
};
const objects={
 'site-assets/data/drill-lecture':{text:'synthetic academic file\n',type:'text/plain'},
 'materials/drill-student/drill-file/original':{text:'synthetic personal file\n',type:'text/plain'},
 'progress/drill-student/drill-snapshot':{text:'{"records":{"CVP-P1":{"done":{"0":"2026-11-22"}}}}',type:'application/json'},
};
function localWorker(){
 return new Miniflare({
  host:'127.0.0.1',port:0,
  workers:[{name:'recovery-drill',modules:true,script:'export default { fetch(){ return new Response("Local recovery drill"); } }',
   d1Databases:{DB:'recovery-synthetic'},r2Buckets:{BUCKET:'recovery-synthetic'}}],
 });
}
async function applySchema(db){
 for(const file of schema){
  const sql=(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/^\s*--.*$/gm,'');
  const statements=sql.split(';').map(s=>s.trim()).filter(Boolean);
  if(statements.length)await db.batch(statements.map(s=>db.prepare(s)));
 }
}
function statements(db,rows){
 return Object.entries(rows).flatMap(([table,entries])=>{
  const columns=tables[table];
  if(!columns)throw Error('Unexpected restore table');
  return entries.map(row=>db.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...columns.map(c=>row[c])));
 });
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function encrypt(payload,key){
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 return Buffer.concat([iv,cipher.update(JSON.stringify(payload)),cipher.final(),cipher.getAuthTag()]);
}
function decrypt(bytes,key){
 const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
 decipher.setAuthTag(bytes.subarray(-16));
 return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]));
}
async function archive(db,bucket){
 const rows={};
 for(const [table,columns] of Object.entries(tables)){
  rows[table]=(await db.prepare(`SELECT ${columns.join(',')} FROM ${table} ORDER BY 1`).all()).results;
 }
 const files=[];
 for(const item of (await bucket.list()).objects){
  const object=await bucket.get(item.key);
  const data=Buffer.from(await object.arrayBuffer());
  files.push({key:item.key,bytes:data.length,sha256:sha256(data),type:object.httpMetadata.contentType,data:data.toString('base64')});
 }
 assert.equal(files.length,Object.keys(objects).length);
 return {version:1,rows,files};
}
const temp=await mkdtemp(join(tmpdir(),'review-studio-recovery-'));
const path=join(temp,'synthetic.aes');
const key=randomBytes(32);
let source,restore;
try{
 source=localWorker();
 const db=await source.getD1Database('DB'),bucket=await source.getR2Bucket('BUCKET');
 await applySchema(db);
 const now=new Date().toISOString();
 const progressKey='progress/drill-student/drill-snapshot';
 const materialKey='materials/drill-student/drill-file/original';
 await db.batch(statements(db,{
  review_accounts:[{id:'drill-student',email:'student@example.test',created_at:now,last_seen_at:now}],
  study_snapshots:[{user_id:'drill-student',revision:7,snapshot:JSON.stringify({r2Snapshot:progressKey}),updated_at:now}],
  study_materials:[{id:'drill-file',user_id:'drill-student',name:'synthetic.txt',lecture_id:'CVP-P1',mime:'text/plain',
   bytes:Buffer.byteLength(objects[materialKey].text),page_count:1,created_at:now}],
 }));
 for(const [objectKey,value] of Object.entries(objects))await bucket.put(objectKey,value.text,{httpMetadata:{contentType:value.type}});
 const original=await archive(db,bucket);
 await writeFile(path,encrypt(original,key),{mode:0o600});
 await source.dispose();source=null;
 const encrypted=await readFile(path);
 const damaged=Buffer.from(encrypted);damaged[damaged.length-1]^=1;
 assert.throws(()=>decrypt(damaged,key));
 const payload=decrypt(encrypted,key);
 assert.equal(payload.version,1);
 restore=localWorker();
 const target=await restore.getD1Database('DB'),targetBucket=await restore.getR2Bucket('BUCKET');
 await applySchema(target);
 await target.batch(statements(target,payload.rows));
 for(const file of payload.files){
  const data=Buffer.from(file.data,'base64');
  assert.equal(data.length,file.bytes);
  assert.equal(sha256(data),file.sha256);
  await targetBucket.put(file.key,data,{httpMetadata:{contentType:file.type}});
 }
 const integrity=await target.prepare('PRAGMA quick_check').first();
 assert.equal(integrity.quick_check,'ok');
 assert.deepEqual((await target.prepare('PRAGMA foreign_key_check').all()).results,[]);
 const progress=await target.prepare('SELECT revision,snapshot FROM study_snapshots WHERE user_id=?').bind('drill-student').first();
 assert.equal(progress.revision,7);
 assert.equal(await (await targetBucket.get(JSON.parse(progress.snapshot).r2Snapshot)).text(),objects[progressKey].text);
 assert.equal((await target.prepare('SELECT COUNT(*) AS rows FROM study_snapshots WHERE user_id=?').bind('another-student').first()).rows,0);
 assert.deepEqual(await archive(target,targetBucket),original);
 console.log('PASS: encrypted archive restored to fresh local D1 and R2 bindings after disposing of the source. D1 integrity, account scope, revision, and all three object hashes verified.');
}finally{
 key.fill(0);
 await source?.dispose();await restore?.dispose();
 await rm(temp,{recursive:true,force:true});
}
