import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courses} from '../public/course-registry.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
function generated(path){
 const source=read(path),start=source.indexOf(' = ['),end=source.lastIndexOf(']');
 assert.ok(start>=0&&end>start,path+' must contain a generated JSON array');
 return JSON.parse(source.slice(start+3,end+1));
}
const validPath=value=>typeof value==='string'&&value.length>0&&value.length<=512&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'&&!/[\\%?#\x00-\x1f\x7f]/.test(part));
const validId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_.:-]{0,179}$/i.test(value);
const validMime=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*(?:; charset=utf-8)?$/i.test(value);
function validate(rows,{label,key,typed=false,renal=false}){
 assert.ok(Array.isArray(rows)&&rows.length>0,label+' must contain assets');
 const seen=new Set(),sizes=new Map();
 for(const row of rows){
  assert.ok(row&&typeof row==='object'&&!Array.isArray(row),label+' invalid row');
  const id=row[key];
  assert.ok((key==='path'?validPath:validId)(id),label+' invalid '+key+': '+id);
  const canonical=id.normalize('NFC').toLowerCase();
  assert.ok(!seen.has(canonical),label+' duplicate '+key+': '+id);seen.add(canonical);
  assert.match(row.sha,/^[a-f0-9]{64}$/,label+' invalid SHA: '+id);
  assert.ok(Number.isSafeInteger(row.size)&&row.size>0,label+' invalid byte size: '+id);
  if(sizes.has(row.sha))assert.equal(sizes.get(row.sha),row.size,label+' conflicting size for identical SHA');
  sizes.set(row.sha,row.size);
  if(typed)assert.ok(validMime(row.type),label+' invalid MIME type: '+id);
  if(renal){
   assert.ok(validId(row.id)&&typeof row.title==='string'&&row.title.trim(),label+' invalid material metadata: '+id);
   assert.ok(['overview','lecture','lab','booklet'].includes(row.kind),label+' invalid kind: '+id);
   assert.ok(Number.isSafeInteger(row.units)&&row.units>0,label+' invalid units: '+id);
   assert.ok(Array.isArray(row.sessions)&&row.sessions.every(code=>courses.REN.lectureCodes.includes(code))&&new Set(row.sessions).size===row.sessions.length,label+' invalid sessions: '+id);
  }
 }
 return rows;
}
test('all combined site-asset registries have valid noncolliding public paths and consistent hashes',()=>{
 const renal=json('public/renal-materials.json'),mol=json('public/mol-study-assets.json');
 validate(renal,{label:'REN material IDs',key:'id',renal:true});
 validate(renal,{label:'REN material paths',key:'path',renal:true});
 validate([...generated('lib/site-assets-manifest.ts'),...json('lib/active-booklet-assets.json'),...renal,...json('lib/renal-assessment-assets.json'),...json('lib/microscope-assets.json'),...json('lib/renal-lesson-figures.json'),json('lib/renal-booklet-asset.json'),mol.booklet,mol.assessments,...mol.sources],{label:'combined site assets',key:'path'});
});
test('study-asset and private-media manifests have unique IDs or paths and valid byte metadata',()=>{
 validate(generated('lib/study-asset-registry.ts'),{label:'study assets',key:'id',typed:true});
 validate(json('lib/private-media-manifest.json'),{label:'private media',key:'path',typed:true});
});
test('manifest validator rejects case collisions, traversal and inconsistent content metadata',()=>{
 const base={path:'materials/a.pdf',sha:'a'.repeat(64),size:100};
 for(const bad of [{...base,path:'materials/A.pdf'},{...base,path:'../a.pdf'},{...base,path:'materials/b.pdf',size:101},{...base,path:'materials/c.pdf',sha:'invalid'}]){
  assert.throws(()=>validate([base,bad],{label:'fixture',key:'path'}));
 }
});
