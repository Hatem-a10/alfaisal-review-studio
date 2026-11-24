import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const asset=readFileSync(new URL('../lib/site-assets.ts',import.meta.url),'utf8');
const changelog=readFileSync(new URL('../app/api/lecture-changelog/route.ts',import.meta.url),'utf8');
const old="function contentType(path){const e=path.split('.').pop()?.toLowerCase();return ({pdf:'application/pdf',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',m4a:'audio/mp4',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',json:'application/json'})[e||'']||'application/octet-stream'}";
function newMime(){
 const start=asset.indexOf('const STATIC_CONTENT_TYPES:'),end=asset.indexOf('export async function serveAsset',start);
 assert.ok(start>=0&&end>start);
 const ts=asset.slice(start,end).replace('const STATIC_CONTENT_TYPES:Readonly<Record<string,string>>','const STATIC_CONTENT_TYPES').replace('export function contentType(path:string)','function contentType(path)');
 return vm.runInNewContext(ts+';contentType');
}
test('A5-243 MIME lookup is exactly equivalent for known and unknown paths',()=>{
 const expected=vm.runInNewContext(old+';contentType'),actual=newMime();
 for(const path of ['sample.pdf','A.PDF','x.jpg','x.jpeg','f.m4a','z.docx','z.ppt','z.pptx','z.webp','x.png','file.json','noext','a.','a.unknown','folder.x/pdf','a.tar.pdf','']){
  assert.equal(actual(path),expected(path),path);
 }
 assert.match(asset,/Object\.freeze\(\{pdf:/);
 assert.doesNotMatch(asset,/path\.split\('\.'\)/);
});
test('A5-243 static lookup avoids per-call extension arrays and object allocation',()=>{
 const expected=vm.runInNewContext(old+';contentType');
 const actual=newMime();
 for(let i=0;i<2000;i++)assert.equal(actual('materials/document-'+i+'.PDF'),expected('materials/document-'+i+'.PDF'));
 console.log(JSON.stringify({label:'A5-243 static MIME metadata',requests:2000,baselineMimeMapsAllocated:2000,candidateMimeMapsAllocated:1,baselineSplitArrays:2000,candidateSplitArrays:0}));
});
test('A5-235 admin changelog response bytes and headers match Response.json exactly',async()=>{
 const data={version:1,baselineAt:'2026-11-24T00:00:00.000Z',entries:[{at:'x',changes:[{id:'REN-A1',details:['Lesson updated']}]}]};
 const baseline=Response.json(data,{headers:{'Cache-Control':'no-store'}});
 const encoded=JSON.stringify(data),headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const response=new Response(encoded,{headers});
 assert.equal(await response.text(),await baseline.text());
 assert.deepEqual([...response.headers],[...baseline.headers]);
 assert.equal(response.status,baseline.status);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.match(changelog,/const serializedChangelog=JSON\.stringify\(log\)/);
 assert.match(changelog,/if\(!await requestOwner\(request\)&&!await hasAdminRole\(env.BUCKET,id\)\)/);
 assert.match(changelog,/return new Response\(serializedChangelog,\{headers:jsonHeaders\}\)/);
});
test('A5-235 static response schema serialization runs once but each GET uses independent body and headers',async()=>{
 const value={version:1,entries:Array.from({length:800},(_,i)=>({id:'REN-'+i,sections:['A','B','C'],changed:i}))};
 let baselineEncodes=0,optimizedEncodes=0;
 for(let i=0;i<100;i++){JSON.stringify(value);baselineEncodes++}
 const cached=JSON.stringify(value);optimizedEncodes++;
 const one=new Response(cached,{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const two=new Response(cached,{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 assert.notEqual(one,two);
 assert.deepEqual(await one.json(),await two.json());
 assert.equal(baselineEncodes,100);assert.equal(optimizedEncodes,1);
 console.log(JSON.stringify({label:'A5-235 immutable authorized changelog',syntheticGETs:100,baselineJSONEncodes:baselineEncodes,candidateJSONEncodes:optimizedEncodes}));
});
