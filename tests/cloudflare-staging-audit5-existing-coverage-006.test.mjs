import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('A5-064 unchanged companion-store value is compared before storage write',()=>{
 const code=read('public/study-vault.js');
 assert.match(code,/function set\(name,value\)[^\n]*serialized!==JSON\.stringify\(read\(name\)\)\)localStorage\.setItem/);
});
test('A5-099 build groups and minifies CSS while preserving inline style boundaries',()=>{
 const src=read('scripts/client-styles.mjs');
 assert.match(src,/if\(group\.length&&\/<style/);
 assert.match(src,/transformSync\(text,\{loader:'css',minify:true/);
 assert.match(src,/replacements\.reverse\(\)/);
});
test('A5-169 OSPE marks are user-assessed rather than tokenized from answer prose',()=>{
 const ospe=read('public/ospe.js');
 assert.match(ospe,/self-assessed practice marks/i);
 assert.match(ospe,/data-ospe-mark/);
 assert.match(ospe,/data-value=/);
 const core=read('public/ospe-core.mjs');
 assert.doesNotMatch(core,/tokeniz|\btokenMatch\b/i);
});
test('A5-197 reading streams use a single bounded typed-array assembly',async()=>{
 const source=read('public/source-demand.js'),fn=source.split('\n').find(line=>line.includes('async function readBytes('));
 assert.ok(fn&&fn.includes('new Uint8Array(n)'));
 const readBytes=vm.runInNewContext(fn+';readBytes',{Uint8Array,Error});
 let canceled=0,released=0;
 const stream={getReader:()=>{const parts=[new Uint8Array([1,2,3]),new Uint8Array([4,5])];let i=0;return {read:async()=>i<parts.length?{done:false,value:parts[i++]}:{done:true},cancel:async()=>{canceled++},releaseLock:()=>{released++}}}};
 const output=await readBytes(stream,5);assert.deepEqual([...output],[1,2,3,4,5]);assert.equal(released,1);
 await assert.rejects(readBytes(stream,4),/device limit/);assert.equal(canceled,1);assert.equal(released,2);
});
test('A5-202 service-worker setup has no explicit timer or repeated update polling',()=>{
 const client=read('public/phase3-offline.mjs');
 assert.match(client,/navigator\.serviceWorker\.register\('\/review-sw\.js'/);
 assert.doesNotMatch(client,/registration\.update\s*\(|setInterval\s*\(/);
});
test('A5-226 Anki view exit and face replacement release created object URLs',()=>{
 const client=read('public/anki.js');
 assert.match(client,/if\(b\.id==='ankiClose'\)[^\n]*URL\.revokeObjectURL/);
 assert.match(client,/async function ankiSrcdoc\([^\n]*URL\.revokeObjectURL/);
});
