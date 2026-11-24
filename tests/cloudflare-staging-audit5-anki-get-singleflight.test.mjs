import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const old="async function loadAnkiDecks(){const account=ankiAccount(),run=++ankiLoadGeneration;try{const local=await ankiLocalDecks();if(run!==ankiLoadGeneration||ankiAccount()!==account)return;ankiDecks=local;const shared=await fetch('/api/shared-decks',{cache:'no-store'});const sharedDecks=shared.ok?(await shared.json()).decks||[]:[];if(run!==ankiLoadGeneration||ankiAccount()!==account)return;ankiShared=sharedDecks;const r=await fetch('/api/decks',{cache:'no-store'});if(r.ok){const remote=(await r.json()).decks||[];if(run!==ankiLoadGeneration||ankiAccount()!==account)return;ankiRemote=remote}else ankiStatus='Could not refresh cloud decks. Your device decks remain available.';if(view==='anki')render()}catch(e){if(run===ankiLoadGeneration&&ankiAccount()===account){ankiStatus=e.message;if(view==='anki')render()}}}";
const source=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('const ankiListingRequests=new Map();'),source.indexOf('async function loadAnkiDecks()'));
const current=source.split('\n').find(l=>l.startsWith('async function loadAnkiDecks()'));
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve))};
function fixture(fn,helpers=''){
 let account='A',renders=0;
 const calls=[];
 const fetch=path=>new Promise((resolve,reject)=>calls.push({path,account,resolve,reject}));
 const ctx=vm.createContext({ankiLoadGeneration:0,ankiAccount:()=>account,ankiLocalDecks:async()=>[{id:'LOCAL-'+account}],ankiDecks:[],ankiRemote:[],ankiShared:[],ankiStatus:'',view:'anki',render:()=>renders++,fetch,Map});
 vm.runInContext(helpers+'\n'+fn+'\nthis.run=loadAnkiDecks;this.state=()=>({decks:ankiDecks,shared:ankiShared,remote:ankiRemote,status:ankiStatus})',ctx);
 const finish=(call,{ok=true}={})=>call.resolve({ok,json:async()=>({decks:[{id:call.path+':'+call.account}]})});
 return {run:ctx.run,setAccount:value=>account=value,calls,finish,state:ctx.state,renders:()=>renders};
}
function matching(f,path){return f.calls.filter(x=>x.path===path)}
test('A5-231 overlapping account GETs coalesce and preserve same final deck state',async()=>{
 const a=fixture(old),b=fixture(current,helper);
 for(const x of [a,b]){
  const first=x.run();await flush();
  const second=x.run();await flush();
  assert.equal(matching(x,'/api/shared-decks').length,x===a?2:1);
  for(const call of matching(x,'/api/shared-decks'))x.finish(call);
  await flush();
  assert.equal(matching(x,'/api/decks').length,1);
  x.finish(matching(x,'/api/decks')[0]);
  await Promise.all([first,second]);
 }
 assert.deepEqual(b.state(),a.state());assert.equal(b.renders(),a.renders());
});
test('A5-231 account transitions never reuse another identity cache result',async()=>{
 const b=fixture(current,helper);
 const aPromise=b.run();await flush();
 b.setAccount('B');const next=b.run();await flush();
 assert.equal(matching(b,'/api/shared-decks').length,2);
 b.finish(matching(b,'/api/shared-decks')[1]);await flush();
 assert.equal(matching(b,'/api/decks').length,1);
 b.finish(matching(b,'/api/decks')[0]);await next;
 b.finish(matching(b,'/api/shared-decks')[0]);await aPromise;
 assert.deepEqual(b.state().shared,[{id:'/api/shared-decks:B'}]);
 assert.deepEqual(b.state().remote,[{id:'/api/decks:B'}]);
 assert.equal(b.renders(),1);
});
test('A5-231 failed requests release pending slot; later request re-fetches',async()=>{
 const b=fixture(current,helper);
 const first=b.run();await flush();
 b.calls[0].reject(new Error('offline'));await first;
 assert.equal(b.state().status,'offline');
 const second=b.run();await flush();assert.equal(matching(b,'/api/shared-decks').length,2);
 b.finish(b.calls[1]);await flush();b.finish(matching(b,'/api/decks')[0]);await second;
 assert.equal(b.state().status,'offline'); // matches original behavior: success does not reset prior status here
});
test('A5-231 simultaneous re-render storm shares one same-account GET',async()=>{
 const b=fixture(current,helper);const first=b.run();await flush();
 const more=[];for(let i=0;i<40;i++)more.push(b.run());await flush();
 assert.equal(matching(b,'/api/shared-decks').length,1);
 b.finish(matching(b,'/api/shared-decks')[0]);await flush();
 assert.equal(matching(b,'/api/decks').length,1);
 b.finish(matching(b,'/api/decks')[0]);await Promise.all([first,...more]);
 console.log(JSON.stringify({label:'A5-231 account-specific deck listing coalescing',concurrentReloads:41,sharedGetRequests:1,personalGetRequests:1}));
});
