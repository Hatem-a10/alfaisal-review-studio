import test from 'node:test';
import assert from 'node:assert/strict';
import {storageBreakdown} from '../scripts/storage-breakdown.mjs';
import {storageDetails} from '../public/site-storage.mjs';

test('package inventory accounts for every file and estimates reclaimable meshes separately',()=>{
 const breakdown=storageBreakdown([
  {path:'client/anatomy-models/ribcage.glb.gz',bytes:4000},
  {path:'client/anatomy-models/ribcage.webp',bytes:200},
  {path:'client/cvp-week3-figures/heart.webp',bytes:100},
  {path:'client/_studio/reading-a.json.gz',bytes:80},
  {path:'client/lesson-expansion-data.json',bytes:60},
  {path:'client/vendor/pdf.mjs',bytes:40},
  {path:'server/index.js',bytes:20},
  {path:'.openai/hosting.json',bytes:10},
 ]);
 assert.equal(Object.values(breakdown.categories).reduce((a,b)=>a+b,0),4510);
 assert.equal(breakdown.categories.models,4200);
 assert.equal(breakdown.modelOffloadBytes,4000);
 assert.equal(breakdown.largest[0].path,'client/anatomy-models/ribcage.glb.gz');
 const html=storageDetails({breakdown,measuredExpandedBytes:5000},268435456);
 assert.match(html,/3D models & previews/);
 assert.match(html,/Move model meshes to private storage/);
 assert.match(html,/Largest files in this build/);
});
