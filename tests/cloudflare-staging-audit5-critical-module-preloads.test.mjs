import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criticalModules,preloadCriticalModules} from '../public/phase1-critical-preloads.mjs';

const runtime=readFileSync(new URL('../public/phase1-runtime.mjs',import.meta.url),'utf8');
function documentFixture(){
 const links=[],head={append(link){links.push(link)}};
 const doc={head,createElement:tag=>{assert.equal(tag,'link');return {}},querySelector:query=>links.find(x=>query==='link[rel="modulepreload"][href="'+x.href+'"]')};
 return {doc,links};
}
test('A5-013 fetch independent critical module URLs early but retain side effect execution order',()=>{
 const {doc,links}=documentFixture(),created=preloadCriticalModules(doc,'https://staging.example/phase1-runtime.mjs',{effectiveType:'4g'});
 assert.equal(created.length,2);assert.equal(links.length,2);
 assert.deepEqual(links.map(x=>x.href),criticalModules.map(m=>new URL(m,'https://staging.example/phase1-runtime.mjs').href));
 assert.ok(links.every(x=>x.rel==='modulepreload'));
 assert.equal(preloadCriticalModules(doc,'https://staging.example/phase1-runtime.mjs',{}).length,0);
 const reading=runtime.indexOf('await Promise.all([import("./reading-tools.js');
 const mobile=runtime.indexOf('await import("./mobile-dock.js');
 const navigation=runtime.indexOf('await import("./studio-navigation.js');
 assert.ok(reading>=0&&mobile>reading&&navigation>mobile);
 assert.match(runtime,/preloadCriticalModules\(document,import\.meta\.url,navigator\.connection\)/);
 // Preloads must use exactly the URLs the runtime imports, or the browser fetches twice.
 assert.deepEqual(criticalModules,['mobile-dock','studio-navigation'].map(name=>runtime.match(new RegExp('import\\("(\\./'+name+'\\.js\\?v=\\d+)"\\)'))?.[1]));
});
test('A5-013 constrained data plans do not add speculative modulepreload requests',()=>{
 for(const connection of [{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}]){
  const {doc,links}=documentFixture();
  assert.deepEqual(preloadCriticalModules(doc,'https://example.test/phase1-runtime.mjs',connection),[]);
  assert.equal(links.length,0);
 }
 assert.deepEqual(preloadCriticalModules(null,'https://example.test/phase1-runtime.mjs',{}),[]);
});
test('A5-013 responsive navigation preloads are not credentialed API requests',()=>{
 const {doc,links}=documentFixture();preloadCriticalModules(doc,'https://example.test/phase1-runtime.mjs',{});
 assert.equal(new Set(links.map(x=>x.href)).size,2);
 assert.ok(links.every(x=>new URL(x.href).origin==='https://example.test'&&!new URL(x.href).pathname.startsWith('/api/')));
 console.log(JSON.stringify({label:'A5-013 critical navigation modulepreload',independentDownloadsStarted:2,sequentialEvaluationsPreserved:true,privateRequests:0}));
});
