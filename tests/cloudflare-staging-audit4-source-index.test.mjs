import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {deferSourceReading} from '../scripts/source-demand.mjs';
const source=readFileSync(new URL('../public/source-demand.js',import.meta.url),'utf8');
function harness(data,learning={sources:[]}){
 let calls=0;
 const context={documentPanel:()=>'',sourceQuestionsPanel:()=>'',searchPassages:()=>'',library:()=>'',document:{addEventListener(){}},window:{reviewCourseScope:'MOL'},LEARNING:learning,view:'library',render(){},sourceSearch:'a',uploads:[],uploadBodies:{},sourceById:id=>learning.sources.find(s=>s.id===id),librarySourceInCourse:()=>true,libraryDocumentURL:(s,p)=>'/doc/'+p,esc:String,fetch:async url=>{calls++;return new Response(JSON.stringify(data[url]))},AbortController,setTimeout,clearTimeout,TextDecoder,Blob,DecompressionStream};
 const instrumented=source.replace(/\}\)\(\);\s*$/,'globalThis.audit={load,readingMap,checkedSearchIndex,pending,errors};})();');
 runInNewContext(instrumented,context);
 return {context,api:context.audit,calls:()=>calls};
}
test('one network reading request hydrates every source that shares its content URL',async()=>{
 const h=harness({'/r':[{page:1,text:'content'}]}),a={readingURL:'/r',pages:[{page:1,text:''}]},b={readingURL:'/r',pages:[{page:1,text:''}]};
 await Promise.all([h.api.load(a),h.api.load(b),h.api.load(a)]);
 assert.equal(h.calls(),1);assert.equal(a.pages[0].text,'content');assert.equal(b.pages[0].text,'content');assert.equal(b.readingLoaded,true);
});
test('invalid duplicate reading pages and incomplete payloads do not mark a source loaded',async()=>{
 const h=harness({'/r':[{page:1,text:'content'}]});
 for(const rows of [[{page:0,text:'x'}],[null],[{page:1,text:'a'},{page:1,text:'b'}]])assert.throws(()=>h.api.readingMap(rows),/Invalid reading data/);
 const a={readingURL:'/r',pages:[{page:1,text:''},{page:2,text:''}]};
 await h.api.load(a);assert.equal(a.readingLoaded,undefined);assert.equal(a.pages[0].text,'');assert.match(h.api.errors.get('/r'),/Incomplete/);
});
const index=snippet=>({version:1,pages:[{source:'s',page:1,snippet}],terms:{a:[0]}});
test('search index checks page metadata and posting offsets before installing it',()=>{
 const h=harness({});
 for(const data of [null,{...index('x'),pages:[null]},{...index('x'),terms:[]},{...index('x'),terms:{a:[1]}},{...index('x'),terms:{a:'0'}},{...index('x'),terms:{a:[.5]}}])assert.throws(()=>h.api.checkedSearchIndex(data),/Invalid search index/);
 assert.equal(h.api.checkedSearchIndex(index('x')).pages.length,1);
});
test('changing the content-addressed index URL invalidates index and cached postings',async()=>{
 const learning={searchIndexURL:'/one',sources:[{id:'s',readingURL:'/r'}]},h=harness({'/one':index('first'),'/two':index('second')},learning);
 h.context.searchPassages();await h.api.pending.get('/one').promise;
 assert.match(h.context.searchPassages(),/first/);
 learning.searchIndexURL='/two';assert.doesNotMatch(h.context.searchPassages(),/first/);await h.api.pending.get('/two').promise;
 assert.match(h.context.searchPassages(),/second/);assert.equal(h.calls(),2);
});
test('normalized local text matches retain a readable snippet and empty search has feedback',async()=>{
 const learning={searchIndexURL:'/empty',sources:[{id:'s',pages:[{page:1,text:'prefix ﬀ suffix'}]}]},h=harness({'/empty':{version:1,pages:[],terms:{}}},learning);
 h.context.sourceSearch='ff';h.context.searchPassages();await h.api.pending.get('/empty').promise;
 assert.match(h.context.searchPassages(),/prefix ﬀ suffix/);
 h.context.sourceSearch='unmatched';assert.match(h.context.searchPassages(),/No matching pages/);
});
test('deferred index generator preserves single-letter terms supported by the reader',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'review-search-'));
 try{
  const output=deferSourceReading('const LEARNING='+JSON.stringify({sources:[{id:'s',pages:[{page:1,text:'A B C alpha'}]}],sourceQuestions:[]}),dir);
  const data=runInNewContext(output+';LEARNING');
  const index=JSON.parse(gunzipSync(readFileSync(path.join(dir,data.searchIndexURL.slice(1)))));
  assert.deepEqual(index.terms.a,[0]);assert.deepEqual(index.terms.b,[0]);assert.deepEqual(index.terms.alpha,[0]);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
