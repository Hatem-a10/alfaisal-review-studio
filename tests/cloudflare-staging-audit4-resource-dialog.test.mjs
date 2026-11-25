import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/managed-auth-client.js',import.meta.url),'utf8');
const resourcePath='/api/control-center/student/resources/12345678-1234-1234-1234-123456789abc/download';
const response=(data,ok=true)=>({ok,json:async()=>data});
function harness(fetch){
 const dialogs=[];
 function element(tag){
  return {tag,children:[],dataset:{},setAttribute(){},append(...c){this.children.push(...c)},addEventListener(type,fn){this[type+'Handler']=fn},showModal(){this.open=true},close(){this.open=false;this.closeHandler?.()},remove(){this.removed=true},querySelector(){return this.children.find(x=>x.tag==='button')},focus(){this.focused=true}};
 }
 const document={createElement:element,createTextNode:text=>({text}),querySelector:()=>true,body:{append:node=>dialogs.push(node)},head:{append(){}}};
 const start=source.indexOf('  let resourceDialog=null;'),end=source.indexOf('  function recordError()',start);
 const api=runInNewContext(source.slice(start,end)+'\n({showResources})',{document,fetch,api:'/api/control-center/student/',label:text=>Object.assign(element('p'),{textContent:text}),AbortController});
 return {...api,dialogs};
}
test('first-page failure offers retry without advancing offset',async()=>{
 const urls=[],h=harness(async url=>{urls.push(url);return urls.length===1?response({},false):response({offset:0,total:1,resources:[{title:'Document',downloadUrl:resourcePath}]})});
 await h.showResources();const d=h.dialogs[0],next=d.children[4];assert.equal(next.hidden,false);assert.equal(next.textContent,'Retry');
 await next.onclick();assert.equal(urls[0],urls[1]);assert.equal(d.children[3].children.length,1);assert.equal(next.hidden,true);
});
test('overlapping open requests use one dialog and closing aborts stale results',async()=>{
 let release,signal;const h=harness(async(url,options)=>{signal=options.signal;return new Promise(r=>release=r)});
 const first=h.showResources();await h.showResources();assert.equal(h.dialogs.length,1);assert.equal(h.dialogs[0].children[1].focused,true);
 h.dialogs[0].close();assert.equal(signal.aborted,true);release(response({offset:0,total:1,resources:[{title:'Late',downloadUrl:resourcePath}]}));await first;
 assert.equal(h.dialogs[0].children[3].children.length,0);
});
test('malformed page rejected atomically and duplicate resources not appended',async()=>{
 let calls=0;const good={title:'Document',downloadUrl:resourcePath};
 const h=harness(async()=>response(++calls===1?{offset:0,total:2,resources:[good,null]}:calls===2?{offset:0,total:2,resources:[good]}:{offset:1,total:2,resources:[good]}));
 await h.showResources();const d=h.dialogs[0],next=d.children[4];assert.equal(d.children[3].children.length,0);assert.equal(next.textContent,'Retry');
 await next.onclick();await next.onclick();assert.equal(d.children[3].children.length,1);assert.equal(next.hidden,true);
});
test('an empty page with a positive remaining total stops repeated no-progress pagination',async()=>{
 const h=harness(async()=>response({offset:0,total:5,resources:[]}));
 await h.showResources();assert.equal(h.dialogs[0].children[4].hidden,true);assert.match(h.dialogs[0].children[2].textContent,/list changed/);
});
test('failed sign-out shows a safe retry and retains the offline lock',async()=>{
 const mount={replaceChildren(){},append(...children){this.children=children}};
 const document={body:{dataset:{authPage:'sign-out'}},getElementById:()=>mount,createElement:()=>({dataset:{},setAttribute(){}}),head:{append(node){node.onload()}}};
 let calls=0,lock;const Clerk={async load(){},async signOut(){calls++;if(calls===1)throw Error('private provider detail')}};
 await runInNewContext(source,{document,setTimeout,clearTimeout,window:{Clerk},fetch:async()=>response({frontendAPI:'https://clerk.example'}),localStorage:{setItem(k,v){lock=v}}});
 const [button,status]=mount.children;await button.onclick();assert.equal(button.disabled,false);assert.equal(lock,'1');assert.match(status.textContent,/try again/);assert.doesNotMatch(status.textContent,/private provider/);
 await button.onclick();assert.equal(calls,2);
});
