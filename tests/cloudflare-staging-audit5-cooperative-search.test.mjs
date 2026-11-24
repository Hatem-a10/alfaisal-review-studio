import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIndex,buildIndexCooperatively,searchIndex} from '../public/phase1-search.mjs';

const large=()=>{
 const make=(prefix,n)=>Array.from({length:n},(_,i)=>({id:prefix+'-'+i,title:i%6?'Renal anatomy & physiology '+i:'Cardiac conduction '+i,context:'M1 '+i%3}));
 return {lectures:make('l',1500),objectives:make('o',2100),questions:make('q',3400),materials:make('m',800)};
};
test('A5-030 cooperative index has byte-for-byte equivalent entries and identical ranked results',async()=>{
 const source=large();source.questions.push({...source.questions[0]});source.materials.push({id:'missing',title:''});
 const old=buildIndex(source),next=await buildIndexCooperatively(source,{batchSize:257,yieldControl:async()=>{}});
 assert.deepEqual(next,old);
 for(const q of ['renal','anatomy','cardiac conduction','M1','missing',''])assert.deepEqual(searchIndex(next,q),searchIndex(old,q));
});
test('A5-030 bounded indexing yields repeatedly rather than monopolizing one task',async()=>{
 const data=large();let yields=0;
 const result=await buildIndexCooperatively(data,{batchSize:200,yieldControl:async()=>{yields++;await Promise.resolve()}});
 assert.equal(yields,Math.floor(7800/200));assert.equal(result.length,7800);
 console.log(JSON.stringify({label:'A5-030 cooperative search indexing',entries:7800,maximumEntriesPerTask:200,scheduledYields:yields}));
});
test('A5-117 session changes cancel work and discard uncommitted partial results',async()=>{
 const data=large();let allowed=true,yields=0;
 const partial=await buildIndexCooperatively(data,{batchSize:100,yieldControl:async()=>{yields++;allowed=false},allow:()=>allowed});
 assert.equal(partial,null);assert.equal(yields,1);
 const alreadyClosed=await buildIndexCooperatively(data,{allow:()=>false,yieldControl:async()=>{throw Error('Must not schedule canceled work')}});
 assert.equal(alreadyClosed,null);
});
test('A5-117 no cancelation means exactly one complete index for short and empty sessions',async()=>{
 for(const data of [{lectures:[{id:'one',title:'One'}]},{}]){
  const result=await buildIndexCooperatively(data,{allow:()=>true});
  assert.deepEqual(result,buildIndex(data));
 }
 await assert.rejects(buildIndexCooperatively({}, {batchSize:0}),/batch size/);
});
