import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {buildLearningPayload,generatedLearningPayload,reusableLearningPayload} from '../scripts/learning-payload.mjs';

const originalSource=bytes=>'// Generated losslessly from public/learning-data.js by scripts/learning-payload.mjs.\nexport const payload = '+JSON.stringify(gzipSync(bytes,{level:9}).toString('base64'))+';\n';
test('A5-101 generated TS payload matches old algorithm byte for byte on fresh build',()=>{
 const root=mkdtempSync(join(tmpdir(),'review-a5-101-'));try{
  const inputPath=join(root,'input.js'),outputPath=join(root,'payload.ts'),bytes=Buffer.from('const LEARNING={questions:[{id:"q",stem:"Cardiac output"}]};\n'.repeat(150));
  writeFileSync(inputPath,bytes);
  assert.equal(buildLearningPayload({inputPath,outputPath}),true);
  const source=readFileSync(outputPath,'utf8');
  assert.equal(source,originalSource(bytes));assert.equal(reusableLearningPayload(source,bytes),true);
  assert.deepEqual(gunzipSync(Buffer.from(JSON.parse(source.slice(source.indexOf(' = ')+3,-2)),'base64')),bytes);
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('A5-101 identical academic input reuses verified gzip and skips compression/writes',()=>{
 const root=mkdtempSync(join(tmpdir(),'review-a5-101-'));try{
  const inputPath=join(root,'input.js'),outputPath=join(root,'payload.ts');
  writeFileSync(inputPath,'let lectures=["REN-P1","REN-A2"]'.repeat(1000));
  let encodes=0;const compress=(...args)=>{encodes++;return gzipSync(...args)};
  assert.equal(buildLearningPayload({inputPath,outputPath,compress}),true);
  const previous=statSync(outputPath).mtimeMs;
  for(let i=0;i<40;i++)assert.equal(buildLearningPayload({inputPath,outputPath,compress}),false);
  assert.equal(encodes,1);assert.equal(statSync(outputPath).mtimeMs,previous);
  console.log(JSON.stringify({label:'A5-101 verified unchanged learning gzip',builds:41,fullGzipEncodesBefore:41,after:1}));
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('A5-101 altered teaching content and damaged cached gzip are detected and repaired',()=>{
 const root=mkdtempSync(join(tmpdir(),'review-a5-101-'));try{
  const inputPath=join(root,'input.js'),outputPath=join(root,'payload.ts');writeFileSync(inputPath,'let lesson="first"');
  buildLearningPayload({inputPath,outputPath});const first=readFileSync(outputPath,'utf8');
  writeFileSync(inputPath,'let lesson="second"');assert.equal(buildLearningPayload({inputPath,outputPath}),true);
  assert.notEqual(readFileSync(outputPath,'utf8'),first);
  writeFileSync(outputPath,'// corrupted payload');
  assert.equal(buildLearningPayload({inputPath,outputPath}),true);
  assert.equal(readFileSync(outputPath,'utf8'),originalSource(Buffer.from('let lesson="second"')));
  const valid=readFileSync(outputPath,'utf8');writeFileSync(outputPath,valid.slice(0,-3)+'!'+valid.slice(-3));
  assert.equal(buildLearningPayload({inputPath,outputPath}),true);
  assert.equal(readFileSync(outputPath,'utf8'),valid);
  assert.equal(reusableLearningPayload('export const payload="abc";\n',Buffer.from('x')),false);
  assert.equal(reusableLearningPayload(generatedLearningPayload(gzipSync(Buffer.from('something'))),Buffer.from('different')),false);
 }finally{rmSync(root,{recursive:true,force:true})}
});
