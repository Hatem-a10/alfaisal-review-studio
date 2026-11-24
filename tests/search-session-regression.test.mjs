import test from 'node:test';
import assert from 'node:assert/strict';
import {installSearch} from '../public/phase1-search.mjs';

function element(){
 const events=new Map(),attrs=new Map();
 return {children:[],value:'',open:false,textContent:'',addEventListener:(name,fn)=>events.set(name,fn),emit(name,event={}){return events.get(name)?.(event)},setAttribute:(key,value)=>attrs.set(key,value),getAttribute:key=>attrs.get(key),removeAttribute:key=>attrs.delete(key),append(...children){this.children.push(...children)},prepend(...children){this.children.unshift(...children)},replaceChildren(){this.children=[]},focus(){},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false;this.emit('close')}};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const payload=title=>({lectures:[{id:title,title}]});
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('search isolates closed and reopened async sessions, reflects loading, and supports keyboard selection',async()=>{
 const host=element(),body=element(),dialog=element(),input=element(),list=element(),status=element(),close=element();
 const old=globalThis.document;
 host.querySelector=()=>null;
 dialog.querySelector=s=>({'input':input,'[role=listbox]':list,'[role=status]':status,'[data-search-close]':close})[s];
 globalThis.document={body,activeElement:host,getElementById:()=>null,querySelector:()=>null,addEventListener(){},createElement:tag=>tag==='dialog'?dialog:element()};
 const first=deferred(),second=deferred(),reads=[first.promise,second.promise,Promise.resolve(payload('New lecture'))],opened=[];
 try{
  installSearch({host,read:()=>reads.shift(),open:item=>opened.push(item.id),blocked:()=>false});
  const one=host.children[0].onclick();assert.match(status.textContent,/Loading/);
  dialog.close();const two=host.children[0].onclick();input.value='lecture';
  second.resolve(payload('New lecture'));await two;
  assert.equal(list.children.length,1);assert.equal(list.children[0].tabIndex,-1);assert.equal(input.getAttribute('aria-expanded'),'true');
  first.resolve(payload('Old lecture'));await one;await flush();
  input.emit('input');await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(list.children[0].children[1].textContent,'New lecture');
  input.emit('keydown',{key:'Enter',preventDefault(){}});assert.deepEqual(opened,['New lecture']);
 }finally{globalThis.document=old}
});
