import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as policy from '../public/phase3-cache-policy.mjs';
const code=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8').split('\n').slice(1).join('\n');
function harness(){
 const listeners={},records=new Map();let fetched=0,enabled=0,claimed=0,stored=0;
 const caches={async open(name){if(!records.has(name))records.set(name,new Map());const map=records.get(name);return {async put(r,response){stored++;map.set(typeof r==='string'?r:r.url,response.clone())},async match(r){return map.get(typeof r==='string'?r:r.url)?.clone()},async keys(){return [...map.keys()]},async delete(r){return map.delete(r)}}},async keys(){return [...records.keys()]},async delete(name){return records.delete(name)}};
 const self={location:{origin:'https://demo.example'},registration:{navigationPreload:{async enable(){enabled++}}},clients:{async claim(){claimed++}},addEventListener(type,handler){listeners[type]=handler}};
 vm.runInNewContext(code,{...policy,self,caches,Response,Request,URL,Map,Set,fetch:async()=>{fetched++;return new Response('network')}});
 const activate=async()=>{let task;listeners.activate({waitUntil(p){task=p}});await task};
 const request=(path,preloadResponse)=>{let reply;listeners.fetch({request:new Request(self.location.origin+path),clientId:'client',preloadResponse,respondWith(p){reply=p}});if(!reply)throw Error('Fetch was not handled');return reply};
 return {activate,request,counts:()=>({fetched,enabled,claimed,stored})};
}
test('A5-204 enables navigation preload on supported service workers',async()=>{
 const h=harness();await h.activate();assert.equal(h.counts().enabled,1);assert.equal(h.counts().claimed,1);
});
test('A5-204 navigation consumes preloaded response rather than issuing a duplicate fetch',async()=>{
 const h=harness(),preload=Promise.resolve(new Response('preloaded',{headers:{'Content-Type':'text/html'}}));
 const response=await h.request('/',preload);
 assert.equal(await response.text(),'preloaded');
 assert.equal(h.counts().fetched,0);
 assert.equal(h.counts().stored,1);
 console.log(JSON.stringify({label:'A5-204 navigation preload',preloadAvailable:true,networkFetches:0,preloadedResponsesUsed:1}));
});
test('A5-204 absent or rejected navigation preload retains normal network fallback',async()=>{
 const h=harness();
 assert.equal(await (await h.request('/',Promise.resolve(null))).text(),'network');
 assert.equal(await (await h.request('/index.html',Promise.reject(Error('preload interrupted')))).text(),'network');
 assert.equal(h.counts().fetched,2);
});
test('A5-204 preloaded auth responses are not cached as successful public assets',async()=>{
 const h=harness(),bad=new Response('unauthorized',{status:401});
 const r=await h.request('/',Promise.resolve(bad));assert.equal(r.status,401);assert.equal(h.counts().stored,0);
});
