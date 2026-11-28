import test from 'node:test';
import assert from 'node:assert/strict';
import {microscopeCards,slideSource,tissueFrame} from '../public/microscope-lab.mjs';

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

test('photos remain on the specimen cards and only tissue scans are selectable',()=>{
 const cover='/api/site-assets/materials/ren123/microscope/kidney-22-cover.jpg';
 const slides=[1,2,3].map(n=>({sourceSlide:'kidney-22',id:'kidney-22-scan-'+n,name:'Kidney 22 · Scan '+n,
  specimen:'Mammal kidney · sagittal section',accession:'315776',cover}));
 const html=microscopeCards({title:'Kidney',slides});
 assert.equal((html.match(/class="microscope-card"/g)||[]).length,1);
 assert.equal((html.match(/data-slide=/g)||[]).length,2);
 assert.doesNotMatch(html,/data-slide="kidney-22-scan-1"/);
 assert.match(html,/data-slide="kidney-22-scan-2"/);
 assert.match(html,/data-slide="kidney-22-scan-3"/);
 assert.match(html,/315776/);
 assert.ok(html.includes(cover));
});

test('label-only specimens render a cover with no viewer action',()=>{
 const html=microscopeCards({title:'Kidney',slides:[{id:'kidney-scan-1',name:'Kidney · Scan 1'}]});
 assert.doesNotMatch(html,/data-slide=/);
 assert.match(html,/No tissue scan available/);
});

test('capillaries can open Scan 2 when that is the only tissue scan in a specimen',()=>{
 const html=microscopeCards({title:'Kidney',slides:[{id:'capillaries-scan-2',name:'Capillaries · Scan 2'}]});
 assert.match(html,/data-slide="capillaries-scan-2"/);
 assert.doesNotMatch(html,/No tissue scan available/);
});

test('tissue framing ignores black borders and isolated bright specks',()=>{
 const width=100,height=100,pixels=new Uint8ClampedArray(width*height*4);
 const pixel=(x,y)=>pixels.set([150,110,150,255],(y*width+x)*4);
 assert.equal(tissueFrame(pixels,width,height),null);
 for(let y=30;y<70;y++)for(let x=20;x<80;x++)pixel(x,y);
 pixel(1,1);pixel(99,99);
 const frame=tissueFrame(pixels,width,height);
 assert.ok(frame.x>=.15&&frame.x<.2);
 assert.ok(frame.y>=.25&&frame.y<.30);
 assert.ok(frame.x+frame.width>.8&&frame.x+frame.width<.86);
 assert.ok(frame.y+frame.height>.7&&frame.y+frame.height<.76);
});
test('kidney capillaries slide is listed last in its group',async()=>{
 const {microscopeCards}=await import('../public/microscope-lab.mjs');
 const slide=id=>({id:id+'-scan-2',sourceSlide:id,name:id,cover:'/c.jpg'});
 const html=microscopeCards({title:'Kidney',slides:['capillaries-of-kidney-40x','kidney-2','kidney-22'].map(slide)});
 assert.ok(html.indexOf('capillaries-of-kidney-40x')>html.indexOf('kidney-22-scan-2'));
});
