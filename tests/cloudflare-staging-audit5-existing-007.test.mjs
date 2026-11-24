import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('A5-127 timer paints event classes without rebuilding the timetable each second',()=>{
 const hub=src('public/hub-upgrade.js'),paint=hub.split('\n').find(s=>s.trim().startsWith('function paint('));
 assert.match(paint,/campusElements\.forEach/);
 assert.match(paint,/if\(lastDate!==c\.date\)/);
 assert.doesNotMatch(paint,/campusBoard\(/);
 assert.match(hub,/setInterval\(paint,1000\)/);
});
test('A5-130 calendar board emits a bounded five-day visible range',()=>{
 const row=src('public/schedule-ui.js').split('\n').find(s=>s.startsWith('function campusBoard('));
 assert.match(row,/allDays=Array\.from\(\{length:5\}/);
 assert.match(row,/days=compact\?\[allDays\.includes/);
});
test('A5-155 original and shuffled MCQ options are assigned at exam creation, not per render',()=>{
 const exam=src('public/exam-engine.js').split('\n').find(s=>s.trim().startsWith('function create('));
 assert.match(exam,/preserveOptionOrder\?q\.options\.map/);
 assert.match(exam,/reasons:order\.map/);
 assert.match(exam,/answer:order\.indexOf\(q\.answer\)/);
});
test('A5-193 device data hydrates only during initial account activation or explicit switch',()=>{
 const s=src('public/device-storage.js');
 assert.equal([...s.matchAll(/await hydrate\(/g)].length,2);
 assert.match(s,/if\(db\)await hydrate\(!!verifiedAccount\)/);
 assert.match(s,/async switchAccount\(key\)/);
 assert.doesNotMatch(s,/document\.addEventListener\(['"]hashchange['"][^\n]*hydrate/);
});
test('A5-194 companion values are read lazily; bootstrap initially reads only vault metadata',()=>{
 const s=src('public/study-vault.js');
 const first=s.slice(0,s.indexOf('function safeTree('));
 assert.match(first,/localStorage\.getItem\(metaKey\)/);
 assert.doesNotMatch(first,/read\(['"](?:anki|practice|wrongBank|mock|drafts)['"]\)/);
 assert.match(s,/function read\(name,fallback=null\)/);
});
test('A5-227 discarded search-result buttons are released on modal close',()=>{
 const s=src('public/phase1-search.mjs');
 assert.match(s,/dialog\.addEventListener\('close'/);
 assert.match(s,/paintedResults=null;paintedSelected=-1;list\.replaceChildren\(\)/);
 assert.match(s,/request\+\+;activeIndexAbort\?\.abort\(\);index=\[\];results=\[\]/);
});
test('A5-228 material IDs reuse canonical source objects within each library render',()=>{
 const s=src('public/library-list.js'),start=s.indexOf('function libraryLookup('),end=s.indexOf('function libraryDocuments(',start),code=s.slice(start,end);
 const source={id:'REN-A1',name:'Renal Histology.pdf',course:'REN'};
 const uploaded={id:'custom',name:'User document.pdf',course:'REN'};
 const ctx={LEARNING:{sources:[source],lessons:[]},uploads:[uploaded],globalThis:{reviewCourseScope:'REN'}};
 vm.runInNewContext(code+'\nthis.lookup=libraryLookup',ctx);
 const snap=ctx.lookup();
 assert.equal(snap.lookup('REN-A1'),source);
 assert.equal(snap.lookup('custom'),uploaded);
 source.name='Renal Histology 2026.pdf';
 assert.equal(snap.lookup('REN-A1').name,source.name);
});
