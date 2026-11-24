import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/reading-tools.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../public/diagram-variants.json',import.meta.url),'utf8'));
const ds=source.indexOf(' function decorate('),de=source.indexOf(' for(const name',ds);
const core=runInNewContext(source.slice(ds,de)+'\n({decorate})',{DIAGRAM_VARIANTS:manifest});
test('responsive image decoration uses the actual src, avoids duplicate attributes and fills each missing dimension',()=>{
 const [url,meta]=Object.entries(manifest)[0],html='<IMG data-src="/wrong" src="'+url+'" width="200" decoding="sync" sizes="old" />';
 const decorated=core.decorate(html);
 assert.match(decorated,/data-full-src=/);assert.match(decorated,new RegExp('height="'+meta.height+'"'));
 assert.equal((decorated.match(/\swidth=/g)||[]).length,1);assert.equal((decorated.match(/\sdecoding=/g)||[]).length,1);
 assert.equal(core.decorate(decorated),decorated);
 assert.equal(core.decorate('<img data-src="'+url+'">'),'<img data-src="'+url+'">');
});
test('malformed image variants cannot inject attributes or invalid descriptors',()=>{
 const decorate=runInNewContext(source.slice(ds,de)+'\ndecorate',{DIAGRAM_VARIANTS:{'/images/x.png':{width:1000,height:50,480:'" onerror="bad',960:'/images/s.png'},'/images/b.png':{width:0,height:10,480:'/images/x.png'}}});
 const out=decorate('<img src="/images/x.png">');
 assert.doesNotMatch(out,/onerror/);assert.match(out,/\/images\/s.png 960w/);
 assert.equal(decorate('<img src="/images/b.png">'),'<img src="/images/b.png">');
 assert.equal(decorate(null),null);
});
test('settings events are limited to the actual controls and failed srcset clears its sizes',()=>{
 assert.match(source,/!key\|\|!panel.contains\(e.target\)/);
 assert.match(source,/removeAttribute\('srcset'\);img.removeAttribute\('sizes'\)/);
});
test('mobile dock preserves hidden scroll position and coalesces resize/mutation callbacks',()=>{
 const frames=[],nodes=[],listeners={},observers=[],nav={clientWidth:200,scrollWidth:500,scrollLeft:100,closest:()=>null,before(){},querySelectorAll:()=>[{hidden:false,getClientRects:()=>[{}],getBoundingClientRect:()=>({right:500-nav.scrollLeft-4})}],getBoundingClientRect:()=>({left:0}),addEventListener(type,fn){listeners[type]=fn},scrollTo(v){this.scrollLeft=v.left;this.behavior=v.behavior}};
 const document={querySelector:()=>nav,documentElement:{dataset:{readingMotion:'reduce'}},createElement(){const el={setAttribute(){},append(){},focus(){}};nodes.push(el);return el}};
 const window={addEventListener(type,fn){listeners[type]=fn}};
 runInNewContext(readFileSync(new URL('../public/mobile-dock.js',import.meta.url),'utf8'),{document,window,requestAnimationFrame:f=>frames.push(f),matchMedia:()=>({matches:false}),MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},ResizeObserver:class{constructor(fn){observers.push(fn)}observe(){}}});
 frames.shift()();nodes[2].onclick();assert.equal(nav.behavior,'instant');
 const position=nav.scrollLeft;nav.clientWidth=0;observers[0]();observers[1]();listeners.resize();assert.equal(frames.length,1);frames.shift()();assert.equal(nav.scrollLeft,position);assert.equal(nodes[1].disabled,true);assert.equal(nodes[2].disabled,true);
});
