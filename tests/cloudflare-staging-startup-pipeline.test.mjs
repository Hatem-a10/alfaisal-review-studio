import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=html.indexOf(' async function loadStudyScripts(tags){');
const end=html.indexOf(" performance.mark?.('studio-scripts-start');",start);
assert.ok(start>=0&&end>start,'Expected startup loader');
const source=html.slice(start,end);
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function harness(sources,{supported=true,fail=null}={}){
 const appended=[],active=new Set(),scripts=[];
 let maxHints=0;
 const document={
  createElement(tag){
   const el={tag,relList:{supports:()=>supported},remove(){active.delete(el)}};
   return el;
  },
  head:{append(el){
   appended.push([el.tag,el.src||el.href]);
   if(el.tag==='link'){active.add(el);maxHints=Math.max(maxHints,active.size)}
   else scripts.push(el);
  }},
 };
 const load=runInNewContext(source+'\nloadStudyScripts',{document});
 const running=load(sources.map(src=>({dataset:{src}})));
 return {appended,active,scripts,running,get maxHints(){return maxHints},finish(i){const script=scripts[i];assert.ok(script);if(script.src===fail)script.onerror();else script.onload()}};
}

test('startup preloads only bounded static scripts and executes in exact order',async()=>{
 const sources=['a.js?v=1','b.js','/api/lesson-data?v=42','c.js?v=2','d.js','e.js','f.js','g.js','h.js','i.js','j.js'];
 const h=harness(sources);
 assert.deepEqual(h.scripts.map(s=>s.src),['a.js?v=1']);
 assert.ok(h.active.size>0);
 for(let i=0;i<sources.length;i++){
  assert.equal(h.scripts.length,i+1);
  assert.equal(h.scripts[i].src,sources[i]);
  h.finish(i);
  await tick();
 }
 await h.running;
 assert.deepEqual(h.scripts.map(s=>s.src),sources);
 assert.ok(h.maxHints<=7);
 assert.equal(h.active.size,0);
 assert.ok(!h.appended.some(([tag,url])=>tag==='link'&&url.startsWith('/api/')));
 assert.equal(h.appended.filter(([tag,url])=>tag==='link'&&url==='b.js').length,1);
});

test('failed script stops execution and removes all speculative hints',async()=>{
 const h=harness(['a.js','b.js','c.js'],{fail:'b.js'});
 const rejected=assert.rejects(h.running,/Could not load the study app/);
 h.finish(0);await tick();h.finish(1);
 await rejected;
 assert.deepEqual(h.scripts.map(s=>s.src),['a.js','b.js']);
 assert.equal(h.active.size,0);
});

test('unsupported preload falls back to ordinary sequential execution',async()=>{
 const h=harness(['a.js','b.js'],{supported:false});
 h.finish(0);await tick();h.finish(1);
 await h.running;
 assert.deepEqual(h.appended,[['script','a.js'],['script','b.js']]);
});

test('loader is invoked only after the account hydration path',()=>{
 assert.ok(html.indexOf('await loadStudyScripts(')>html.indexOf('if(db)await hydrate(!!verifiedAccount)'));
});
