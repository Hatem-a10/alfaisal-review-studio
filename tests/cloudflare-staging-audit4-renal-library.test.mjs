import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/library-list.js',import.meta.url),'utf8'),manifest=JSON.parse(readFileSync(new URL('../public/renal-materials.json',import.meta.url),'utf8'));
const api=runInNewContext(source+'\n({renalManifestSources,libraryMaterials})',{});
const entry=manifest.find(row=>row.sessions.length);
test('all actual REN manifest entries validate and mapped originals reach lecture rows',()=>{
 const rows=api.renalManifestSources(manifest,[]);
 assert.equal(rows.length,manifest.length);
 for(const row of manifest.filter(r=>r.kind==='lecture'&&r.sessions.length)){
  const source=rows.find(r=>r.id==='ren123-'+row.id);
  assert.deepEqual(Array.from(source.lectureIds),row.sessions.map(code=>'REN-'+code));
  for(const code of row.sessions)assert.equal(api.libraryMaterials({id:'REN-'+code},null,[source]).slides[0].source,source);
 }
});
test('malformed, duplicate and out-of-course manifest paths never modify the source list',()=>{
 const sources=[{id:'existing',url:'/example'}];
 for(const bad of [null,{},[entry,null],[entry,entry],[entry,{...entry,id:'other'}],[entry,{...entry,path:'materials/ren123/other.pdf'}],[{...entry,path:'materials/ren123/../private.pdf'}],[{...entry,sessions:['../a']}],[{...entry,title:''}]])assert.throws(()=>api.renalManifestSources(bad,sources),/Renal document/);
 assert.equal(sources.length,1);
});
test('existing canonical source identities and URLs take precedence',()=>{
 const existing=[{id:'ren123-'+entry.id,url:'/canonical'},{id:'different-id',url:'/api/site-assets/'+entry.path}];
 assert.equal(api.renalManifestSources([entry],existing.slice(0,1)).length,0);
 assert.equal(api.renalManifestSources([entry],existing.slice(1)).length,0);
});
test('a malformed asynchronous manifest leaves the library unchanged and can be retried',async()=>{
 const LEARNING={sources:[]};let rows=[entry,null],renders=0;
 const context={LEARNING,view:'library',reviewCourseScope:'REN',render:()=>{renders++},fetch:async()=>({ok:true,json:async()=>rows})};
 const api=runInNewContext(source+'\n({load:loadRenalLibrary,pending:()=>renalLibraryRequest,ready:()=>renalLibraryReady,error:()=>renalLibraryError})',context);
 api.load();await api.pending();assert.equal(LEARNING.sources.length,0);assert.equal(api.error(),true);
 rows=[entry];api.load();await api.pending();assert.equal(LEARNING.sources.length,1);assert.equal(api.ready(),true);assert.equal(api.error(),false);assert.equal(renders,2);
});
