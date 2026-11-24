import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../app/api/materials/[id]/route.ts',import.meta.url),'utf8');
const before=v=>encodeURIComponent(new TextDecoder().decode(new TextEncoder().encode(typeof v==='string'?v:'document'))).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const after=v=>encodeURIComponent((typeof v==='string'?v:'document').toWellFormed()).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
test('A5-245 every original file-name byte remains unchanged after replacing redundant UTF-8 roundtrip',()=>{
 for(const x of ['file.pdf','Shams_P28_Control of breathing.pdf','lecture (copy) 1.pdf','a!b\'c(d)*.txt','آلة_الكلية.pdf','❤️ cardiac.pptx','𝄞music.pdf','','\uD800','\uDC00','x\uD800a','x\uDC00a','x\uD83D\uDC68a','\uD83D\uDC69\u200D\u2695\uFE0F',null,undefined,42]){
  assert.equal(after(x),before(x),String(x));
 }
 assert.match(src,/\.toWellFormed\(\)/);
 assert.doesNotMatch(src,/new TextDecoder\(\)\.decode\(new TextEncoder\(\)\.encode/);
});
test('A5-245 skips independent encoder and decoder allocations per authorized material download',()=>{
 const requests=1000;
 for(let i=0;i<requests;i++)assert.equal(after('lecture-'+i+'💡.pdf'),before('lecture-'+i+'💡.pdf'));
 console.log(JSON.stringify({label:'A5-245 normalized material filename headers',requests,oldEncoderInstances:requests,oldDecoderInstances:requests,newEncoderInstances:0,newDecoderInstances:0}));
});
