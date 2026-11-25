import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf('function syncValuesEqual('),app.indexOf('window.reviewPendingSyncCounts='));
const count=vm.runInNewContext(code+'\npendingSyncCounts');
test('pending snapshot comparison counts unique changed records, settings and store values',()=>{
 const old={records:{a:{n:1},b:{n:2}},settings:{theme:'dark'},extras:{stores:{anki:{value:{a:1},at:1}}}};
 const next={records:{a:{n:2},c:{n:3}},settings:{theme:'dark',size:4},extras:{stores:{anki:{value:{a:1},at:5},notes:{value:[1]}}}};
 assert.deepEqual(JSON.parse(JSON.stringify(count(next,old))),{records:3,settings:1,stores:1});assert.equal(count(next,null),null);
});
test('offline scheduling avoids network retries and connectivity events trigger status and retry',()=>{
 assert.match(app,/async function syncCloud\(force=false\)\{if\(navigator.onLine===false\)/);
 assert.match(app,/if\(navigator.onLine!==false\)syncTimer=setTimeout/);
 assert.match(app,/addEventListener\('offline',\(\)=>\{clearTimeout\(syncTimer\)/);
 assert.match(app,/Back online · retrying saved changes/);
});
