import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/source-demand.js',import.meta.url),'utf8');
function harness(terms){
 const context={documentPanel:()=>'',sourceQuestionsPanel:()=>'',searchPassages:()=>'',library:()=>'',document:{addEventListener(){}},window:{reviewCourseScope:'MOL'},LEARNING:{searchIndexURL:'/new'},view:'library',render(){},fetch:()=>new Promise(()=>{}),AbortController,setTimeout:()=>0,clearTimeout(){}};
 const instrumented=source.replace(/\}\)\(\);\s*$/,'globalThis.audit={setIndex:terms=>{searchIndex={terms,pages:[]};searchIndexURL="/old"},pagesFor,cache:()=>({size:termCache.size,bytes:termCacheBytes,max:termCacheMaxBytes,keys:[...termCache.keys()]})};})();');
 runInNewContext(instrumented,context);context.audit.setIndex(terms);return context;
}
test('A5-223 source cache bounds retained postings by estimated bytes without changing results',()=>{
 const rows=Array.from({length:40000},(_,i)=>i),huge=Array.from({length:70000},(_,i)=>i),h=harness({a:rows,b:rows,c:huge});
 assert.deepEqual(Array.from(h.audit.pagesFor('a')),rows);
 assert.deepEqual(Array.from(h.audit.pagesFor('b')),rows);
 assert.equal(h.audit.cache().size,1);
 assert.deepEqual(Array.from(h.audit.cache().keys),['b']);
 assert.deepEqual(Array.from(h.audit.pagesFor('c')),huge);
 assert.deepEqual(Array.from(h.audit.cache().keys),['b']);
 assert.ok(h.audit.cache().bytes<=h.audit.cache().max);
 assert.deepEqual(Array.from(h.audit.pagesFor('a')),rows);
 console.log(JSON.stringify({label:'A5-223 estimated retained posting bytes',priorTwoEntries:2*(128+2+rows.length*32),candidate:h.audit.cache().bytes,cap:h.audit.cache().max}));
});
test('A5-223 entry limit and version reset keep byte accounting exact',()=>{
 const h=harness({});
 for(let i=0;i<150;i++)h.audit.pagesFor('term'+i);
 assert.equal(h.audit.cache().size,100);
 assert.ok(h.audit.cache().bytes>0);
 h.searchPassages();
 assert.equal(h.audit.cache().size,0);
 assert.equal(h.audit.cache().bytes,0);
});
