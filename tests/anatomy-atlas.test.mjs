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
 assert.equal(Object.keys(atlas.models).length,10);
 for(const [id,model] of Object.entries(atlas.models)){
  assert.match(gallery,new RegExp('data-atlas-model="'+id+'"'));
  assert.match(model[3],/^[AP]\d+( [AP]\d+)*$/);
  assert.equal(readModel(id+'.webp').toString('ascii',8,12),'WEBP');
  if(id!=='heart'&&id!=='complete')assert.ok(labels[model[5]||id]);
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

test('every structure has a layer, with independent spine and muscle groups',()=>{
 for(const [id,parts] of Object.entries(labels)){
  const ids=Object.keys(parts);
  assert.deepEqual([...new Set(atlas.groupParts(id,ids).flatMap(([,members])=>members))].sort(),ids.sort());
 }
 const groups=Object.fromEntries(atlas.groupParts('ribcage',Object.keys(labels.ribcage)));
 assert.equal(groups['Cervical spine'].length,7);
 assert.equal(groups['Thoracic spine'].length,12);
 for(const [index,prefix] of [[7,'C'],[12,'T']]){
  for(let i=1;i<=index;i++)assert.ok(Object.values(labels.ribcage).some(label=>label.startsWith(prefix+i+' · ')));
 }
 for(const name of ['External intercostals','Internal intercostals','Innermost intercostals'])assert.equal(groups[name].length,1);
 const lungLayers=Object.fromEntries(atlas.groupParts('lungs',Object.keys(labels.lungs)));
 assert.ok(lungLayers['Left lower lobe segments'].includes('FMA7376'));
});

test('vertebra labels accept numbers or anatomical names without accepting the wrong level',()=>{
 assert.ok(atlas.matchesLabel('C1',labels.ribcage.atlas));
 assert.ok(atlas.matchesLabel('Atlas',labels.ribcage.atlas));
 assert.ok(atlas.matchesLabel('T4',labels.ribcage['fourth-thoracic-vertebra']));
 assert.ok(atlas.matchesLabel('Fourth thoracic vertebra',labels.ribcage['fourth-thoracic-vertebra']));
 assert.equal(atlas.matchesLabel('T5',labels.ribcage['fourth-thoracic-vertebra']),false);
});

test('all atlas viewers expose the heart controls and the same right-panel search',()=>{
 const heartControls=atlas.exploreControls('heart').replaceAll('id="heart','id="atlas');
 const atlasControls=atlas.exploreControls('atlas').replaceAll(' disabled','');
 assert.equal(atlasControls,heartControls.replaceAll(' disabled',''));
 for(const id of Object.keys(atlas.models).filter(id=>id!=='heart')){
  const html=atlas.page(id);
  assert.ok(html.includes(atlas.exploreControls('atlas')));
  assert.match(html,/<aside[^>]*>[\s\S]*Find a structure[\s\S]*id="atlasSearch"/);
  assert.match(html,/id="atlasExplorer" class="anatomy-layout atlas-explorer"/);
  assert.match(html,/Visible layers · select any combination/);
  assert.match(html,/id="atlasPreset"/);
  assert.ok(html.indexOf('id="atlasKnown"')<html.indexOf('id="atlasStage"'));
  assert.match(html,/id="atlasSearchJump" aria-controls="atlasSidebar"/);
  assert.match(html,/<aside id="atlasSidebar" class="panel heart-notes atlas-parts"/);
 }
});

test('hiding selected structures keeps independent hidden structures until restored',()=>{
 const hidden=new Set(['left-main-bronchus']);
 atlas.toggleHidden(hidden,['trachea','right-main-bronchus']);
 assert.deepEqual([...hidden],['left-main-bronchus','trachea','right-main-bronchus']);
 atlas.toggleHidden(hidden,['trachea','right-main-bronchus']);
 assert.deepEqual([...hidden],['left-main-bronchus']);
});

test('complete model registers every specimen once and groups the combined structures',()=>{
 const layout=JSON.parse(readModel('complete.json'));
 assert.deepEqual(Object.keys(layout).sort(),[...Object.keys(labels),'heart'].sort());
 const composite=[];
 for(const [key,placement] of Object.entries(layout)){
  assert.ok(placement.scale>0);
  assert.equal(placement.offset.length,3);
  assert.ok(placement.offset.every(Number.isFinite));
  if(key==='heart'){composite.push('heart/ventricular-wall');continue;}
  for(const part of placement.omit||[])assert.ok(Object.hasOwn(labels[key],part));
  for(const part of Object.keys(labels[key]))if(!placement.omit?.includes(part))composite.push(key+'/'+part);
 }
 assert.equal(composite.filter(key=>key.endsWith('/trachea')||key.endsWith('/FMA7394')).length,1);
 assert.ok(composite.length>140);
 assert.ok(atlas.groupParts('complete',composite).every(([name])=>name!=='Other structures'));
});
