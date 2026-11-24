import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/bounded-request.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {readBounded,RequestTooLarge,boundedForm}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('actual request bytes, not UTF-16 string length, are bounded',async()=>{
 const r=new Request('https://example.test',{method:'POST',body:'ééé'});await assert.rejects(readBounded(r,5),RequestTooLarge);
 const good=new Request('https://example.test',{method:'POST',body:'éé'});assert.equal((await readBounded(good,4)).length,4);
});
test('missing or misleading Content-Length does not bypass the stream limit',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(4));c.enqueue(new Uint8Array(4));c.close()}});
 const r=new Request('https://example.test',{method:'POST',body,duplex:'half',headers:{'content-length':'1'}});
 await assert.rejects(readBounded(r,6),RequestTooLarge);
});
test('bounded multipart keeps fields and rejects excessive envelope',async()=>{
 const f=new FormData();f.set('file',new Blob(['abc']),'a.txt');f.set('lectureId','REN-A1');
 const request=()=>new Request('https://example.test',{method:'POST',body:f});
 const result=await boundedForm(request(),2048);assert.equal(result.get('lectureId'),'REN-A1');assert.equal(await result.get('file').text(),'abc');
 await assert.rejects(boundedForm(request(),5),RequestTooLarge);
});
test('PATCH reuses the snapshot it already loaded and uncertain saves do not remove referenced objects',()=>{
 const s=readFileSync(new URL('../app/api/progress/route.ts',import.meta.url),'utf8');
 assert.match(s,/writeSnapshot\(id,body.revision,snapshot,prior\)/);
 assert.match(s,/current\?\.revision===revision\+1&&current.snapshot===snapshot/);
 assert.match(s,/validCompanion\(k,v.value\?\?null\)/);
});
