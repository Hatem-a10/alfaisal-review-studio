import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,statSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {transformSync} from 'esbuild';
import {cachedTransform} from '../scripts/minifier-cache.mjs';

const js={loader:'js',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,charset:'utf8',target:'safari16.4',legalComments:'none'};
const css={loader:'css',minify:true,target:'safari16.4',legalComments:'none'};
test('A5-273 generated JS and CSS output exactly matches direct esbuild minifier bytes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a5-minify-'));try{
  const sources=[['const message = "Renal 🧠"; function test(x){return x+1} //# source\n',js],['.card { color: #123456; transition: opacity 200ms; }',css]];
  for(const [source,options] of sources){
   const expected=transformSync(source,options).code;
   assert.equal(cachedTransform(source,options,{cacheDir:dir}),expected);
   assert.equal(cachedTransform(source,options,{cacheDir:dir}),expected);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('A5-273 unchanged inputs skip repeated transform invocations and writes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a5-minify-'));try{
  let invocations=0;const transform=(...args)=>{invocations++;return transformSync(...args)};
  const src=Array.from({length:2000},(_,i)=>'const item'+i+'='+i+';').join('\n');
  const first=cachedTransform(src,js,{cacheDir:dir,transform});
  const files=readdirSync(dir).filter(f=>f.endsWith('.txt'));assert.equal(files.length,1);
  const cache=join(dir,files[0]),mtime=statSync(cache).mtimeMs;
  for(let i=0;i<40;i++)assert.equal(cachedTransform(src,js,{cacheDir:dir,transform}),first);
  assert.equal(invocations,1);assert.equal(statSync(cache).mtimeMs,mtime);
  console.log(JSON.stringify({label:'A5-273 unchanged esbuild minification',repeatBuilds:41,baselineMinifyCalls:41,candidateCalls:1,sourceBytes:Buffer.byteLength(src)}));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('A5-273 options changes, esbuild-version changes, input edits, and corrupt cache invalidate',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a5-minify-'));try{
  let count=0;const transform=(...args)=>{count++;return transformSync(...args)};
  const a=cachedTransform('let x=1',js,{cacheDir:dir,transform,version:'v1'});
  const firstFile=readdirSync(dir).find(f=>f.endsWith('.txt'));
  assert.equal(cachedTransform('let x=1',js,{cacheDir:dir,transform,version:'v1'}),a);assert.equal(count,1);
  cachedTransform('let x=2',js,{cacheDir:dir,transform,version:'v1'});
  cachedTransform('let x=1',{...js,minifyIdentifiers:true},{cacheDir:dir,transform,version:'v1'});
  cachedTransform('let x=1',js,{cacheDir:dir,transform,version:'v2'});
  assert.equal(count,4);
  writeFileSync(join(dir,firstFile),'damaged');
  assert.equal(cachedTransform('let x=1',js,{cacheDir:dir,transform,version:'v1'}),a);
  assert.equal(count,5);
  assert.equal(cachedTransform('let x=1',js,{transform}),transformSync('let x=1',js).code);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('A5-273 startup and stylesheet build routes both use verified local cache',()=>{
 const script=readFileSync(new URL('../scripts/client-scripts.mjs',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../scripts/client-styles.mjs',import.meta.url),'utf8');
 assert.match(script,/cachedTransform\(src,\{loader:'js'/);
 assert.match(styles,/cachedTransform\(text,\{loader:'css'/);
 for(const s of [script,styles])assert.match(s,/\.sites-runtime\/minifier-cache/);
});
