import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/mobile-dock.js',import.meta.url),'utf8');
const old=source.replace("nav.addEventListener('scroll',schedule,{passive:true})","nav.addEventListener('scroll',update,{passive:true})");
function device(code){
 const raf=[],events=new Map(),buttons=[],counts={layoutReads:0};
 const button=()=>({
  hidden:false,getClientRects:()=>[{}],getBoundingClientRect:()=>{counts.layoutReads++;return {right:460,left:100}},
  setAttribute(){},focus(){},scrollTo(){},className:'',innerHTML:'',
 });
 buttons.push(button(),button(),button());
 const nav={scrollLeft:0,scrollWidth:480,clientWidth:240,closest:()=>null,
  querySelectorAll:()=>buttons,
  getBoundingClientRect:()=>{counts.layoutReads++;return {left:100,right:340}},
  before(){},addEventListener:(name,fn)=>events.set(name,fn),
  scrollTo({left}){this.scrollLeft=left}
 };
 const doc={querySelector:()=>nav,createElement:tag=>({tag,append(){},setAttribute(){},addEventListener(){},innerHTML:''}),documentElement:{dataset:{}}};
 const context={document:doc,window:null,requestAnimationFrame:fn=>raf.push(fn),
  matchMedia:()=>({matches:false})};context.window={addEventListener(){}};
 vm.runInNewContext(code,context);
 const flush=()=>{const frames=raf.splice(0);for(const fn of frames)fn();return frames.length};
 return {nav,counts,emit:()=>events.get('scroll')?.(),flush,frames:()=>raf.length};
}
test('A5-036 scroll bursts consolidate layout reads to one animation frame',()=>{
 const before=device(old),after=device(source);before.flush();after.flush();
 const baseline=before.counts.layoutReads,current=after.counts.layoutReads;
 for(let i=0;i<240;i++){before.nav.scrollLeft=after.nav.scrollLeft=i/3;before.emit();after.emit()}
 assert.ok(before.counts.layoutReads-baseline>=240*2);
 assert.equal(after.counts.layoutReads,current);
 assert.equal(after.frames(),1);
 assert.equal(after.flush(),1);
 assert.equal(after.counts.layoutReads-current,2);
 assert.equal(after.frames(),0);
 console.log(JSON.stringify({label:'A5-036 frame-aligned mobile dock scroll',events:240,layoutReadsBefore:before.counts.layoutReads-baseline,layoutReadsAfter:after.counts.layoutReads-current}));
});
test('A5-036 final previous/next button states match existing eager scroll behavior',()=>{
 const before=device(old),after=device(source);before.flush();after.flush();
 for(const pos of [0,20,80,180,230]){before.nav.scrollLeft=after.nav.scrollLeft=pos;before.emit();after.emit();after.flush();
  assert.equal(before.nav.scrollLeft,after.nav.scrollLeft);
 }
 assert.match(source,/nav\.addEventListener\('scroll',schedule,\{passive:true\}\)/);
 assert.match(source,/requestAnimationFrame\(\(\)=>\{queued=false;update\(\)\}\)/);
});
