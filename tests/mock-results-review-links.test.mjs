import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8');
test('mock results show lecture titles with a Review lesson action',()=>{
 assert.ok(s.includes('<td>${etLectureCell(id,r)}</td>'));
 assert.ok(s.includes('data-et-review-lesson'));
 assert.match(s,/window\.chooseLesson\?\.\(id,'lesson'\)/);
});
test('weak lectures (<70%) get the primary review button; unknown ids fall back to the id',()=>{
 assert.match(s,/r\.correct\/r\.total<0\.7/);
 assert.match(s,/if\(!item\)return esc\(id\)/);
});
