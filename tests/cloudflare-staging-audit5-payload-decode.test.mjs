import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="import {payload} from '../../../lib/learning-payload';\nexport const dynamic='force-dynamic';\nexport async function GET(){const compressed=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}})}\n";
const candidate=readFileSync(new URL('../app/api/lesson-data/route.ts',import.meta.url),'utf8');
function load(source,payload){
 let decodes=0;
 const plain=source.replace(/^import .*?;\n/m,'').replace('export const dynamic','const dynamic').replace('export async function GET','async function GET').replace('let compressedBytes:Uint8Array<ArrayBuffer>|undefined;','let compressedBytes;');
 const context=vm.createContext({payload,Uint8Array,Blob,Response,DecompressionStream,atob:encoded=>{decodes++;return atob(encoded)}});
 vm.runInContext(plain+'\nthis.run=GET',context);
 return {run:context.run,decodes:()=>decodes};
}
test('A5 lazy lesson payload cache preserves exact decoded JS and headers across responses',async()=>{
 const bytes=Buffer.from('const MOL = "renal & molecular";\n'.repeat(5000));
 const payload=gzipSync(bytes).toString('base64'),old=load(baseline,payload),modern=load(candidate,payload);
 for(let i=0;i<4;i++){
  const a=await old.run(),b=await modern.run();
  assert.equal(b.status,a.status);assert.deepEqual([...b.headers],[...a.headers]);
  assert.equal(await b.text(),await a.text());
 }
 assert.equal(old.decodes(),4);assert.equal(modern.decodes(),1);
});
test('A5 immutable 1 MiB gzip payload is decoded once per Worker instance',async()=>{
 const bytes=Buffer.alloc(1050000);let seed=0x2137a4de;
 for(let i=0;i<bytes.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;bytes[i]=seed&255}
 const payload=gzipSync(bytes,{level:6}).toString('base64');
 const a=load(baseline,payload),b=load(candidate,payload);
 let oldMs=0,newMs=0;
 for(let i=0;i<4;i++){const t=performance.now();const x=await a.run();assert.equal((await x.arrayBuffer()).byteLength,bytes.length);oldMs+=performance.now()-t}
 for(let i=0;i<4;i++){const t=performance.now();const x=await b.run();assert.equal((await x.arrayBuffer()).byteLength,bytes.length);newMs+=performance.now()-t}
 assert.equal(a.decodes(),4);assert.equal(b.decodes(),1);
 console.log(JSON.stringify({label:'Audit5 immutable gzip payload decode (extra)',baselineTotalMs:oldMs,candidateTotalMs:newMs,gzipBase64Bytes:payload.length,sourceBytes:bytes.length,baselineDecodes:a.decodes(),candidateDecodes:b.decodes()}));
});
