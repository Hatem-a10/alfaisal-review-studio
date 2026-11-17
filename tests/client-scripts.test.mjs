import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {optimizeClientScripts} from '../scripts/client-scripts.mjs';
test('production bundle preserves ordered shared globals, Unicode content and original source files',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-script-'));try{fs.mkdirSync(path.join(root,'dist/client'),{recursive:true});fs.mkdirSync(path.join(root,'public'));const sources={'data.js':"'use strict';const items=[{id:'MOL-1',answer:'α → β'}];function getItem(){return items[0]}",'app.js':"const current=getItem();globalThis.result={id:current.id,answer:current.answer};"};for(const [name,text]of Object.entries(sources))fs.writeFileSync(path.join(root,'public',name),text);fs.writeFileSync(path.join(root,'dist/client/index.html'),'<html><head><link rel="stylesheet" href="style.css"></head><body><script type="application/x-review-studio" data-src="data.js?v=1"></script><script type="application/x-review-studio" data-src="app.js?v=1"></script></body></html>');const r=optimizeClientScripts(root),html=fs.readFileSync(path.join(root,'dist/client/index.html'),'utf8'),file=html.match(/data-src="([^"]+)"/)[1],ctx={};assert.equal(r.requestsBefore,2);assert.equal(r.requestsAfter,1);assert.equal((html.match(/<script/g)||[]).length,1);assert.ok(html.includes('application/x-review-studio'));assert.ok(html.includes('href="style.css"'));vm.runInNewContext(fs.readFileSync(path.join(root,'dist/client',file),'utf8'),ctx);assert.equal(ctx.result.id,'MOL-1');assert.equal(ctx.result.answer,'α → β');for(const [name,text]of Object.entries(sources))assert.equal(fs.readFileSync(path.join(root,'public',name),'utf8'),text)}finally{fs.rmSync(root,{recursive:true,force:true})}});
test('lesson payload occupies its original dependency position and no redundant preload remains',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-payload-'));try{fs.mkdirSync(path.join(root,'dist/client'),{recursive:true});fs.mkdirSync(path.join(root,'public'));fs.writeFileSync(path.join(root,'public/learning-data.js'),"const LEARNING={questions:[{id:'q',answer:2}]};");fs.writeFileSync(path.join(root,'public/check.js'),"globalThis.answer=LEARNING.questions[0].answer");fs.writeFileSync(path.join(root,'dist/client/index.html'),'<head><link rel="preload" as="script" href="/api/lesson-data?v=42"></head><script type="application/x-review-studio" data-src="/api/lesson-data?v=42"></script><script type="application/x-review-studio" data-src="check.js"></script>');optimizeClientScripts(root);const html=fs.readFileSync(path.join(root,'dist/client/index.html'),'utf8'),ctx={};assert.ok(!html.includes('/api/lesson-data'));vm.runInNewContext(fs.readFileSync(path.join(root,'dist/client',html.match(/data-src="([^"]+)"/)[1]),'utf8'),ctx);assert.equal(ctx.answer,2)}finally{fs.rmSync(root,{recursive:true,force:true})}});

test('installed app targets the document directly without changing app identity or scope',()=>{const m=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));assert.equal(m.id,'/');assert.equal(m.scope,'/');assert.equal(m.start_url,'/index.html')});

test('bundle cleanup removes redundant deployed copies and keeps independent entry points',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-prune-'));
 try{
  const dist=path.join(root,'dist/client'),pub=path.join(root,'public');
  fs.mkdirSync(dist,{recursive:true});fs.mkdirSync(pub);
  const files={'bundle-only.js':'const marker=1;', 'shared-reader.js':'globalThis.marker=marker;', 'lazy.mjs':'export const value=1;'};
  for(const [name,source] of Object.entries(files)){
   fs.writeFileSync(path.join(pub,name),source);
   fs.writeFileSync(path.join(dist,name),source);
  }
  fs.writeFileSync(path.join(dist,'index.html'),'<script type="application/x-review-studio" data-src="bundle-only.js"></script><script type="application/x-review-studio" data-src="shared-reader.js"></script>');
  fs.writeFileSync(path.join(dist,'reader.html'),'<script defer src="shared-reader.js?v=4"></script>');
  const result=optimizeClientScripts(root);
  assert.equal(result.removedFiles,1);
  assert.equal(result.removedBytes,Buffer.byteLength(files['bundle-only.js']));
  assert.ok(!fs.existsSync(path.join(dist,'bundle-only.js')));
  assert.ok(fs.existsSync(path.join(pub,'bundle-only.js')));
  assert.ok(fs.existsSync(path.join(dist,'shared-reader.js')));
  assert.ok(fs.existsSync(path.join(dist,'lazy.mjs')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
