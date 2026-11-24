import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/reading-tools.js',import.meta.url),'utf8');
function harness(reading){return runInNewContext(source.slice(source.indexOf(' const choices='),source.indexOf(' function apply()'))+'\n({preferences,preferenceChange,readBatchPage,readSavedCount})',{storeOptions:()=>({reading})})}
test('reading settings always correspond to an available control option',()=>{
 const h=harness({font:18,line:1.8,width:'unexpected',motion:'unexpected'});
 const p=h.preferences();assert.equal(p.font,17);assert.equal(p.line,1.7);assert.equal(p.width,'standard');assert.equal(p.motion,'system');
 assert.equal(harness({font:Infinity,line:true}).preferences().font,17);
 assert.equal(harness({line:true}).preferences().line,1.7);
});
test('unknown or invalid reading settings cannot overwrite the preference schema',()=>{
 const h=harness({font:20});assert.equal(h.preferenceChange('__proto__',{}),null);assert.equal(h.preferenceChange('contrast','true'),null);
 assert.equal(h.preferenceChange('font','bad').font,20);assert.equal(h.preferenceChange('font','24').font,24);
});
test('deduplication response must advance the cursor or terminate with verified counters',()=>{
 const h=harness({}),page={duplicates:2,reclaimed:100,total:16,processed:8,next:8};
 assert.equal(h.readBatchPage(page,0),page);
 for(const invalid of [{...page,next:0},{...page,next:'8'},{...page,next:7},{...page,next:16},{...page,next:null},{...page,duplicates:-1},{...page,reclaimed:Infinity}])assert.throws(()=>h.readBatchPage(invalid,0),/Invalid storage response/);
 assert.equal(h.readBatchPage({...page,processed:16,next:null},8).next,null);
});
test('asset batch counts require a successful verification flag and safe count',()=>{
 const h=harness({});assert.equal(h.readSavedCount({saved:6,verified:true}),6);
 for(const value of [{saved:6},{saved:'6',verified:true},{saved:201,verified:true},{saved:-1,verified:true}])assert.throws(()=>h.readSavedCount(value),/verification response/);
});
test('resource controls prevent repeated submissions and oversize batches and report partial completion',()=>{
 assert.match(source,/if\(b.disabled\)return/);assert.match(source,/if\(button.disabled\|\|!files.length\)return/);
 assert.match(source,/files\[i\].size>24500000/);assert.match(source,/Transfer stopped after/);assert.match(source,/Check stopped after/);
});
