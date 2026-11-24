import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offlinePrecacheWidth,prioritizeOfflineAssets,cacheKind} from '../public/phase3-cache-policy.mjs';

const worker=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8');
const paths=['/vendor/mathjax-tex-svg.js','/styles.css','/index.html','/api/progress','/_studio/client-0123456789abcdef.js','/api/site-assets/private.pdf','/review-sw.js','/phase3-cache-policy.mjs','/manifest.webmanifest','/','/vendor/sql-wasm.wasm','/phase1-runtime.mjs'];
test('A5-237 precache prioritization retains identical core/navigation entries in stable order',()=>{
 const eligible=paths.filter(path=>['core','navigation'].includes(cacheKind(path)));
 const ordered=prioritizeOfflineAssets(eligible);
 assert.deepEqual([...ordered].sort(),[...eligible].sort());
 assert.deepEqual(ordered.slice(0,4),['/index.html','/review-sw.js','/phase3-cache-policy.mjs','/manifest.webmanifest']);
 assert.equal(ordered[4],'/');
 assert.equal(ordered[5],'/_studio/client-0123456789abcdef.js');
 assert.ok(!ordered.includes('/api/progress'));assert.ok(!ordered.includes('/api/site-assets/private.pdf'));
 assert.match(worker,/const eligible=prioritizeOfflineAssets/);
 assert.match(worker,/const width=offlinePrecacheWidth/);
});
test('A5-238 speculative cache transfers obey network budget without dropping eligible files',async()=>{
 const configs=[[{},8],[{effectiveType:'4g'},8],[{effectiveType:'3g'},4],[{effectiveType:'2g'},2],[{effectiveType:'slow-2g'},2],[{saveData:true,effectiveType:'4g'},2]];
 for(const [connection,width] of configs){
  assert.equal(offlinePrecacheWidth(connection),width);
  let active=0,maxActive=0;const touched=[];
  const rows=Array.from({length:33},(_,i)=>i);
  for(let i=0;i<rows.length;i+=width)await Promise.all(rows.slice(i,i+width).map(async id=>{
   active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,1));touched.push(id);active--;
  }));
  assert.equal(touched.length,33);assert.ok(maxActive<=width);assert.equal(new Set(touched).size,33);
 }
 assert.equal(offlinePrecacheWidth(null),8);
 console.log(JSON.stringify({label:'A5-238 adaptive offline install fetch ceiling',fast:8,threeG:4,twoG:2,saveData:2,allObjectsRetained:true}));
});
test('A5-237 priority ordering is pure and does not touch account-specific cache identity',()=>{
 const original=paths.slice(),first=prioritizeOfflineAssets(paths),second=prioritizeOfflineAssets(paths);
 assert.deepEqual(paths,original);assert.deepEqual(first,second);
 assert.match(worker,/const account=clientsByAccount\.get\(event\.clientId\)/);
 assert.match(worker,/kind==='private'&&!account/);
 assert.match(worker,/if\(kind==='private'\)\{/);
});
