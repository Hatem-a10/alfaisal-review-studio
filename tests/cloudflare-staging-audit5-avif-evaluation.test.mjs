import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePhotoCodecs,syntheticCodecImage} from '../scripts/audit5-image-codec-evaluation.mjs';
import {readFileSync} from 'node:fs';

test('A5-093 synthetic photo-style source encodes and decodes to equal dimensions in AVIF and WebP',async()=>{
 const img=syntheticCodecImage(400,256,{pattern:'photo'}),result=await comparePhotoCodecs(img);
 for(const format of ['avif','webp']){
  assert.equal(result[format].decodedWidth,400);assert.equal(result[format].decodedHeight,256);
  assert.ok(result[format].bytes>0&&result[format].bytes<img.rgb.length);
  assert.ok(result[format].meanAbsoluteChannelError>=0&&result[format].meanAbsoluteChannelError<80);
  assert.ok(result[format].encodeMs>=0);
 }
 console.log(JSON.stringify({label:'A5-093 synthetic photo AVIF vs WebP',sourceRGBBytes:result.sourceRGBBytes,webp:result.webp,avif:result.avif,clinicalVisualEquivalenceProven:false}));
});
test('A5-093 high-contrast synthetic line art is evaluated separately and never silently changed in build',async()=>{
 const result=await comparePhotoCodecs(syntheticCodecImage(320,240,{pattern:'line-art'}));
 assert.ok(result.avif.bytes>0&&result.webp.bytes>0);
 assert.ok(result.avif.meanAbsoluteChannelError<60&&result.webp.meanAbsoluteChannelError<60);
 const pipeline=readFileSync(new URL('../scripts/prepare-study-assets.mjs',import.meta.url),'utf8');
 assert.match(pipeline,/\.webp\(\{quality:78\}\)/);
 assert.doesNotMatch(pipeline,/\.avif\(/);
 console.log(JSON.stringify({label:'A5-093 medical-style synthetic line-art codec evaluation',avifBytes:result.avif.bytes,webpBytes:result.webp.bytes,avifError:result.avif.meanAbsoluteChannelError,webpError:result.webp.meanAbsoluteChannelError,productionCodecUnchanged:true}));
});
test('A5-093 invalid or oversized generated fixtures cannot cause benchmark memory spikes',()=>{
 assert.throws(()=>syntheticCodecImage(2000,2000),/Invalid/);
 assert.throws(()=>syntheticCodecImage(400,400,{pattern:'unknown'}),/Invalid/);
});
