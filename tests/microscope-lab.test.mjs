import test from 'node:test';
import assert from 'node:assert/strict';
import {slideSource} from '../public/microscope-lab.mjs';

function fixture(override={}){
 const json=new TextEncoder().encode(JSON.stringify({width:1024,height:768,tileSize:512,overlap:1,tiles:{'0/0_0':[0,3],'10/1_1':[3,4]},...override}));
 const buffer=new ArrayBuffer(4+json.length+7);
 new DataView(buffer).setUint32(0,json.length);
 new Uint8Array(buffer).set(json,4);
 const reads=[];
 return {reads,size:buffer.byteLength,read:async(start,length)=>{reads.push([start,length]);return buffer.slice(start,start+length)}};
}
test('slide viewport reads only index and exposes its full-resolution tile grid',async()=>{
 const {read,size,reads}=fixture();
 const source=await slideSource(read,size);
 assert.equal(source.maxLevel,10);
 assert.equal(source.getTileUrl(10,1,1),'10/1_1');
 assert.equal(source.tileExists(10,1,1),true);
 assert.equal(source.tileExists(10,4,4),false);
 assert.deepEqual(reads,[[0,4],[4,size-11]]);
});
test('invalid layout and truncated local slides fail before tile reads',async()=>{
 const malformed=fixture({width:0});
 await assert.rejects(slideSource(malformed.read,malformed.size),/Invalid slide layout/);
 const {read,reads}=fixture();
 await assert.rejects(slideSource(read,5),/Invalid slide index/);
 assert.deepEqual(reads,[[0,4]]);
});
