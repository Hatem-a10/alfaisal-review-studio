import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';import {gzipSync} from 'node:zlib';
const s=readFileSync(new URL('../app/api/progress/route.ts',import.meta.url),'utf8');
const bounded=readFileSync(new URL('../lib/bounded-request.ts',import.meta.url),'utf8');
function compile(source){const m={exports:{}};new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
const {readBounded}=compile(bounded);
const chunk=s.slice(s.indexOf('function validPointer('),s.indexOf('async function writeSnapshot('));
const code=ts.transpileModule(chunk+'\nreturn {readSnapshot,encodeLargeSnapshot};',{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
const id='student',key='progress/student/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const snapshot={app:'alfaisal-review-studio',version:2,records:{},extras:{notes:'x'.repeat(2100000)}};
const content=JSON.stringify(snapshot),size=new TextEncoder().encode(content).length;
test('compression is opt-in and legacy raw pointers remain readable',async()=>{
 let object={body:content,size};const api=new Function('env','readBounded',code)({BUCKET:{get:async()=>object}},readBounded);
 const plain=await api.encodeLargeSnapshot(content,size,false);assert.equal(plain.body,content);assert.deepEqual(plain.metadata,{});
 assert.deepEqual(await api.readSnapshot(JSON.stringify({r2Snapshot:key}),id),snapshot);
 const zipped=await api.encodeLargeSnapshot(content,size,true);assert.ok(zipped.body.length<size/10);object={body:zipped.body,size:zipped.body.length};
 const pointer={r2Snapshot:key,...zipped.metadata};assert.deepEqual(await api.readSnapshot(JSON.stringify(pointer),id),snapshot);
 for(const invalid of [{...pointer,bytes:100},{...pointer,sha256:'0'.repeat(64)},{...pointer,storedBytes:3},{...pointer,encoding:'unknown'},{...pointer,r2Snapshot:key.replace('student','other')}])await assert.rejects(api.readSnapshot(JSON.stringify(invalid),id));
 object={body:gzipSync('corrupt'),size:zipped.body.length};await assert.rejects(api.readSnapshot(JSON.stringify(pointer),id));
});
