import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const code=read('study-workflows.js').split('\n').find(l=>l.startsWith('function mergeRecords'));
const merge=runInNewContext(code+'\nmergeRecords',{structuredClone});
test('repeated conflict merges do not duplicate notes or lose unidentified distinct sessions',()=>{
 const a={L:{notes:'left',sessions:[{startedAt:'t',endedAt:'a',seconds:1}]}};
 const b={L:{notes:'right',sessions:[{startedAt:'t',endedAt:'b',seconds:2}]}};
 const once=merge(a,b);assert.equal(once.L.sessions.length,2);assert.equal(once.L.notes,'left\n\n[Other device]\nright');
 assert.equal(merge(once,b).L.notes,once.L.notes);
});
test('oversized combined links are refused without modifying either source',()=>{
 const a={L:{resources:Array.from({length:30},(_,i)=>'https://example.test/'+i)}},b={L:{resources:['https://example.test/new']}};
 assert.throws(()=>merge(a,b),/safe merge limit/);assert.equal(a.L.resources.length,30);assert.equal(b.L.resources.length,1);
});
test('different device option fields merge independently',()=>{
 const code=read('study-vault.js');
 const Storage=function(){};Storage.prototype.getItem=()=>null;Storage.prototype.setItem=function(){};Storage.prototype.removeItem=function(){};
 const vault=runInNewContext(code+'\nStudyVault',{Storage,localStorage:new Storage()});
 const envelope=(value,at)=>({version:1,stores:{options:{value,at}}});
 const a=envelope({mistakes:{a:'note a'},reading:{font:20}},'2026-11-20T00:00:00Z'),b=envelope({mistakes:{b:'note b'},reading:{width:'wide'}},'2026-11-21T00:00:00Z');
 const result=vault.merge(a,b).stores.options.value;
 assert.equal(result.mistakes.a,'note a');assert.equal(result.mistakes.b,'note b');assert.equal(result.reading.font,20);assert.equal(result.reading.width,'wide');
});
test('restoring companion stores uses one device batch with matching bootstrap',()=>{
 const s=read('device-storage.js'),inline=read('index.html').match(/<script id="deviceBootstrap">([\s\S]*?)<\/script>/)?.[1];assert.equal(s,inline);
 assert.match(s,/stageBatch\(entries\)/);assert.match(read('study-vault.js'),/ReviewDevice.stageBatch\(entries\)/);
});
test('visual editor supports non-pointer coordinates',()=>{assert.match(read('study-workflows.js'),/data-mask-coordinate/);assert.match(read('study-workflows.js'),/applyVisualCoordinates/);});
