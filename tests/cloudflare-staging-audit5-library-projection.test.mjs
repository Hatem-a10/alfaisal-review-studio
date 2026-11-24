import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

const src=readFileSync(new URL('../public/library-list.js',import.meta.url),'utf8');
const definitions=src.slice(src.indexOf('function suppliedLectureForFile('),src.indexOf('function librarySourceInCourse('));
const candidates=src.slice(src.indexOf('function libraryLectureCandidates('),src.indexOf('function searchRenalDocuments('));
const context=vm.createContext({});
vm.runInContext(definitions+'\n'+candidates+'\nthis.api={libraryMaterials,libraryLectureCandidates}',context);
const {libraryMaterials,libraryLectureCandidates}=context.api;
const norm=x=>JSON.parse(JSON.stringify(x));

function fixture(size=200,noise=12000){
 let kindReads=0;
 const make=(id,fields={})=>{const obj={id,name:id+'.pdf',...fields};let kind=obj.kind||'Original lecture';delete obj.kind;Object.defineProperty(obj,'kind',{enumerable:true,get(){kindReads++;return kind}});return obj};
 const items=Array.from({length:size},(_,i)=>({id:i%2?'REN-P'+i:'MOL-'+i,course:i%2?'REN':'MOL'}));
 const sourceData=Array.from({length:noise},(_,i)=>make('irrelevant-'+i));
 const lessons=Object.fromEntries(items.map((item,i)=>[item.id,{references:[{source:'by-reference-'+i,page:2}],coverage:{transcriptSource:i%3===0?'by-transcript-'+i:null,slideSources:[{source:'by-coverage-'+i}]}}]));
 for(const [i,item] of items.entries()){
  sourceData.push(make('by-explicit-'+i,{lectureId:item.id,kind:'Original lecture'}));
  sourceData.push(make('by-array-'+i,{lectureIds:[item.id],kind:'slides'}));
  sourceData.push(make('by-range-'+i,{lectureRanges:[{lectureId:item.id,start:12}],kind:'Lecture transcript'}));
  sourceData.push(make('by-reference-'+i,{kind:'Original lecture'}));
  sourceData.push(make('by-coverage-'+i,{kind:'slides'}));
  if(i%3===0)sourceData.push(make('by-transcript-'+i,{kind:'Lecture transcript'}));
 }
 // Identical IDs must not be deduplicated: both source objects were visible before indexing.
 sourceData.push(make('by-reference-0',{kind:'Original lecture'}));
 return {items,sources:sourceData,lessons,reads:()=>kindReads,reset:()=>{kindReads=0},make};
}
function evaluate(input,indexed){
 const {items,sources,lessons}=input,lookup=id=>lessons[id];
 const byLecture=indexed?libraryLectureCandidates(sources,items,lookup):null;
 return items.map(item=>libraryMaterials(item,lookup(item.id),indexed?(byLecture.get(item.id)||[]):sources));
}
function median(fn){fn();const samples=[];for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
test('A5-183 library index preserves canonical source order, duplicates and reference-only matches',()=>{
 const x=fixture(25,500);const a=norm(evaluate(x,false)),b=norm(evaluate(x,true));assert.deepEqual(b,a);
 for(const row of b){assert.equal(row.slides.length,3);assert.ok(row.transcript.length>=1)}
 const newer=x.make('new-attachment',{lectureId:x.items[0].id,kind:'slides'});x.sources.push(newer);
 assert.deepEqual(norm(evaluate(x,true)),norm(evaluate(x,false)));
});
test('A5-183 library material lightweight candidate projection avoids per-lecture full catalog scans',()=>{
 const x=fixture(),baseline=()=>evaluate(x,false),candidate=()=>evaluate(x,true);
 assert.deepEqual(norm(candidate()),norm(baseline()));
 x.reset();baseline();const beforeReads=x.reads();
 x.reset();candidate();const afterReads=x.reads();
 assert.ok(afterReads<beforeReads/8,{afterReads,beforeReads});
 const before=median(baseline),after=median(candidate);
 console.log(JSON.stringify({label:'A5-183 lecture material projection',baselineMedianMs:before,candidateMedianMs:after,baselineKindReads:beforeReads,candidateKindReads:afterReads,lectures:x.items.length,sources:x.sources.length}));
});
