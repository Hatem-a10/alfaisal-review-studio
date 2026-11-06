import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import test from 'node:test';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const readModel=path=>read('public/anatomy-models/'+path);
const atlas=runInNewContext(read('public/anatomy-atlas.js').toString()+'\nAnatomyAtlas',{intro:()=>''});
const labels=JSON.parse(readModel('structures.json'));

test('every gallery card has a thumbnail, lesson mapping and a deferred model',()=>{
 const gallery=atlas.gallery();
 assert.equal(Object.keys(atlas.models).length,9);
 for(const [id,model] of Object.entries(atlas.models)){
  assert.match(gallery,new RegExp('data-atlas-model="'+id+'"'));
  assert.match(model[3],/^[AP]\d+( [AP]\d+)*$/);
  assert.equal(readModel(id+'.webp').toString('ascii',8,12),'WEBP');
  if(id!=='heart')assert.ok(labels[model[5]||id]);
 }
 assert.doesNotMatch(gallery,/\.glb|heart-viewer/);
 assert.equal(atlas.models.airway[5],'lungs');
});

test('all compressed specimens open as valid GLB and their labels match actual mesh names',()=>{
 for(const [id,parts] of Object.entries(labels)){
  const bytes=gunzipSync(readModel(id+'.glb.gz'));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.deepEqual(Object.keys(parts),doc.nodes.map(node=>node.name));
  for(const node of doc.nodes){
   const mesh=doc.meshes[node.mesh];
   assert.equal(mesh.name,node.name);
   assert.ok(mesh.primitives.every(p=>doc.accessors[p.indices].count>0));
  }
 }
 assert.equal(Object.keys(labels.ribcage).filter(id=>id.endsWith('-rib')).length,24);
 assert.equal(Object.keys(labels.lungs).filter(id=>labels.lungs[id].includes('segment')).length,17);
 assert.equal(labels.lungs.FMA7394,'Trachea');
});
