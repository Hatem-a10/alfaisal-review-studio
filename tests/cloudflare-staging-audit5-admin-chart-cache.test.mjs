import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/site-storage.mjs',import.meta.url),'utf8');
const oldHead="const storageChartCache=new WeakMap();\nexport function storageDetails(build,limit){\n const info=build.breakdown;\n if(!info)return '';\n // A5-260: build breakdown and private-media metadata are immutable until refresh.\n // Cache only this page-local, nonpersonal presentation; dynamic admin counters stay live.\n const prior=storageChartCache.get(build);\n if(prior?.info===info&&prior.limit===limit&&prior.measured===build.measuredExpandedBytes&&prior.media===build.privateMedia)return prior.html;";
const original=source.replace(oldHead,"export function storageDetails(build,limit){\n const info=build.breakdown;\n if(!info)return '';")
 .replace(' const html=`<div class="storage-breakdown">',' return `<div class="storage-breakdown">')
 .replace(" storageChartCache.set(build,{info,limit,measured:build.measuredExpandedBytes,media:build.privateMedia,html});\n return html;\n}",'}');
assert.ok(source.includes(oldHead));
const from=async s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
const [prior,optimized]=await Promise.all([from(original),from(source)]);
const build=()=>({measuredExpandedBytes:1234567,privateMedia:{offloaded:false,total:3,bytes:1000},breakdown:{
 categories:{figures:30000,readings:20000,models:80000,tools:60000,app:10000},metadataBytes:3000,
 largest:[{path:'client/synthetic.pdf',bytes:60000},{path:'client/synthetic2.mjs',size:32000}],
 removedBytes:200000,removedFiles:7,modelOffloadBytes:100000
}});
test('A5-260 cached admin storage chart HTML is exactly identical to previous renderer',()=>{
 for(const limit of [10000000,268435456]){
  const a=build(),b=structuredClone(a);
  assert.equal(optimized.storageDetails(a,limit),prior.storageDetails(b,limit));
  assert.equal(optimized.storageDetails(a,limit),prior.storageDetails(b,limit));
 }
 assert.equal(optimized.storageDetails({breakdown:null},100),'');
});
test('A5-260 chart cache invalidates on replacement build, limit, size and private-media',()=>{
 const a=build(),initial=optimized.storageDetails(a,268435456);
 assert.equal(optimized.storageDetails(a,268435456),initial);
 a.measuredExpandedBytes+=50000;
 assert.equal(optimized.storageDetails(a,268435456),prior.storageDetails(a,268435456));
 a.privateMedia={offloaded:true,total:40,bytes:200000};
 assert.equal(optimized.storageDetails(a,268435456),prior.storageDetails(a,268435456));
 a.breakdown={...a.breakdown,categories:{figures:1000,readings:1000}};
 assert.equal(optimized.storageDetails(a,268435456),prior.storageDetails(a,268435456));
 assert.equal(optimized.storageDetails(a,1000000),prior.storageDetails(a,1000000));
});
test('A5-260 unchanged admin re-paints avoid repeatedly deriving chart series and markup',()=>{
 let reads=0;const a=build(),categories=a.breakdown.categories;
 Object.defineProperty(a.breakdown,'categories',{get(){reads++;return categories}});
 for(let i=0;i<200;i++)optimized.storageDetails(a,268435456);
 assert.equal(reads,1);
 assert.match(source,/storageChartCache\.set\(build,/);
 console.log(JSON.stringify({label:'A5-260 repeated admin storage chart',adminPaints:200,categorySeriesRebuildsBefore:200,after:reads}));
});
