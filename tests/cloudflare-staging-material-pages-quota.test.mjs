import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/api/materials/route.ts',import.meta.url),'utf8');
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE study_materials(id TEXT PRIMARY KEY,user_id TEXT,name TEXT,lecture_id TEXT,mime TEXT,bytes INTEGER,page_count INTEGER,created_at TEXT)');
 const add=db.prepare('INSERT INTO study_materials VALUES (?,?,?,?,?,?,?,?)');
 for(let i=0;i<7;i++)add.run('asset-'+i,'student','File '+i,'REN-A1','application/pdf',100,1,i<4?'2026-11-23T12:00:00Z':'2026-11-24T12:00:00Z');
 add.run('deck','student','Anki','ANKI','application/zip',200,10,'2026-11-25T12:00:00Z');
 add.run('other','other','Other','REN-A1','application/pdf',999,1,'2026-11-25T12:00:00Z');
 const env={DB:{prepare(sql){return {bind(...args){return {all:async()=>({results:db.prepare(sql).all(...args)}),first:async()=>db.prepare(sql).get(...args)}}}}};
 const m={exports:{}};
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='cloudflare:workers'?{env}:name.includes('material-lecture-links')?{withMaterialLectureLinks:x=>x}:name.includes('personal-upload')?{PERSONAL_UPLOAD_LIMIT:500000000}:{},m,m.exports);
 const get=(query='',user='student')=>m.exports.GET(new Request('https://example.test/api/materials'+query,{headers:user?{'oai-authenticated-user-id':user}:{}}));
 return {db,get};
}
test('cursor pages are bounded, stable at equal timestamps and account scoped',async()=>{
 const {db,get}=fixture();try{
  let cursor=null,ids=[],pages=0;
  do{const response=await get('?limit=2'+(cursor?'&cursor='+encodeURIComponent(cursor):''));assert.equal(response.status,200);const data=await response.json();assert.ok(data.materials.length<=2);ids.push(...data.materials.map(x=>x.id));cursor=data.nextCursor;pages++;assert.ok(pages<10)}while(cursor);
  assert.deepEqual(ids,['asset-6','asset-5','asset-4','asset-3','asset-2','asset-1','asset-0']);
  for(const q of ['?limit=0','?limit=101','?cursor=bad','?cursor='])assert.equal((await get(q)).status,400);
  assert.equal((await get('?id=other')).status,404);assert.equal((await get('?id=deck')).status,404);
  assert.equal((await (await get('?id=asset-0')).json()).materials[0].id,'asset-0');
  assert.equal((await get('','')).status,401);
 }finally{db.close()}
});
test('quota uses the same registered bytes for documents and Anki decks, never other accounts',async()=>{
 const {db,get}=fixture();try{
  const r=await get('?quota=1');assert.equal(r.headers.get('Cache-Control'),'no-store');
  const body=await r.json();assert.equal(body.usedBytes,900);assert.equal(body.limitBytes,500000000);
  assert.equal((await (await get('?quota=1','other')).json()).usedBytes,999);
  assert.equal((await get('?quota=1','')).status,401);
 }finally{db.close()}
});
