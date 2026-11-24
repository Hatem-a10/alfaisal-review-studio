import test from 'node:test';
import assert from 'node:assert/strict';
import {privateCacheName,privateCacheNames,obsoleteCoreCache,fitsCache,RELEASE_CACHE} from '../public/phase3-cache-policy.mjs';
import {readFileSync} from 'node:fs';
const a='a'.repeat(64),b='b'.repeat(64);
test('private cache survives release changes and selects only exact account namespaces',()=>{
 const prior='review-studio-sw-v1.76:student:'+a,other='review-studio-sw-v1.76:student:'+b;
 assert.deepEqual(privateCacheNames([prior,other,RELEASE_CACHE+':core',privateCacheName(b)],a),[privateCacheName(a),prior]);
 assert.equal(obsoleteCoreCache(prior),false);
 assert.equal(obsoleteCoreCache(privateCacheName(a)),false);
 assert.equal(obsoleteCoreCache('review-studio-sw-v1.00:core'),true);
 assert.equal(obsoleteCoreCache(RELEASE_CACHE+':core'),false);
 assert.deepEqual(privateCacheNames([prior],null),[]);
});
test('checks actual response size without consuming original response',async()=>{
 const tiny=new Response('12345');
 assert.equal(await fitsCache(tiny,5),true);assert.equal(await tiny.text(),'12345');
 const large=new Response('123456');
 assert.equal(await fitsCache(large,5),false);assert.equal(await large.text(),'123456');
 const misleading=new Response('123456',{headers:{'content-length':'1'}});
 assert.equal(await fitsCache(misleading,5),false);assert.equal(await misleading.text(),'123456');
 const declared=new Response('x',{headers:{'content-length':'50'}});
 assert.equal(await fitsCache(declared,5),false);
});
test('worker excludes old cache fallback after identity denial and clears all account caches',()=>{
 const s=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8');
 assert.match(s,/if\(!denied&&clientsByAccount.get\(event.clientId\)===account\)/);
 assert.match(s,/privateCacheNames\(await caches.keys\(\),account\)/);
 assert.match(s,/if\(obsoleteCoreCache\(key\)\)/);
});
