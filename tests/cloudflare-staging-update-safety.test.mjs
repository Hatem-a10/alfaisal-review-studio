import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
function extract(name) {
  const line = app.split('\n').find(s => s.startsWith(name));
  assert.ok(line, 'Expected function in app.js: ' + name);
  return line;
}
function updateHarness({persist,flush,available=true,exam=false,storageOK=true}={}) {
  const button={disabled:false,textContent:'Reload'}, message={textContent:''};
  let reloads=0, active=exam, saves=0;
  const context={
    document:{querySelector:s=>s.includes('update-reload')?button:message,body:{classList:{contains:()=>active}}},
    window:{ReviewDevice:{available,flush:flush||async function(){}}},
    navigator:{},location:{reload(){reloads++}},storageOK,
    persist:()=>{saves++;return persist?.()},
  };
  const reload=runInNewContext(extract('async function reload(){')+'\nreload',context);
  return {reload,button,message,activateExam(){active=true},get reloads(){return reloads},get saves(){return saves}};
}

test('update waits for device flush before navigation and checks again after service worker work',async()=>{
  let release, calls=0;
  const gate=new Promise(resolve=>{release=resolve});
  const h=updateHarness({flush:()=>++calls===1?gate:Promise.resolve()});
  const updating=h.reload();
  await Promise.resolve();
  assert.equal(h.reloads,0);
  assert.equal(h.button.disabled,true);
  release();
  await updating;
  assert.equal(calls,2);
  assert.equal(h.reloads,1);
});

test('failed or unavailable device save blocks reload and permits retry',async()=>{
  for(const options of [{flush:async()=>{throw Error('disk full')}},{available:false},{storageOK:false},{persist:()=>{throw Error('disk full')}}]){
    const h=updateHarness(options);
    await h.reload();
    assert.equal(h.reloads,0);
    assert.equal(h.button.disabled,false);
    assert.match(h.message.textContent,/Could not confirm device saving/);
  }
});

test('a new active exam prevents reload, including while saving',async()=>{
  const active=updateHarness({exam:true});
  await active.reload();
  assert.equal(active.saves,0);
  assert.equal(active.reloads,0);
  let h;
  h=updateHarness({flush:async()=>h.activateExam()});
  await h.reload();
  assert.equal(h.reloads,0);
});

test('a late device write failure also prevents reload',async()=>{
  let calls=0;
  const h=updateHarness({flush:async()=>{if(++calls===2)throw Error('late failure')}});
  await h.reload();
  assert.equal(h.reloads,0);
  assert.equal(h.button.disabled,false);
});

test('review percentage uses all three passes, independent of course closure and empty courses',()=>{
  const context={
    DATA:{items:[{course:'MOL',count:1},{course:'MOL',count:2}]},
    completed:item=>item.count,esc:s=>s,window:{},
  };
  const progress=runInNewContext(extract('function progress(course)')+'\nprogress',context);
  assert.match(progress('MOL'),/>50%<\/span>/);
  assert.match(progress('MOL'),/3 \/ 6 reviews complete/);
  assert.match(progress('OTHER'),/>0%<\/span>/);
  assert.doesNotMatch(progress('OTHER'),/NaN|Infinity/);
});
