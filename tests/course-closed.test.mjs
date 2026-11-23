import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('let courseEndCache');
const end = source.indexOf('globalThis.reviewCourseClosed=courseClosed;');
assert.ok(start > -1 && end > start, 'course closure helpers present in app.js');

function load(events, items) {
  const ctx = {DATA: {events, items}, Date, RegExp, Set, String};
  vm.createContext(ctx);
  vm.runInContext(source.slice(start, end) + ';this.courseClosed=courseClosed;this.courseEndDates=courseEndDates;', ctx);
  return ctx;
}

test('a course closes the day after its last final, OSPE or practical', () => {
  const ctx = load([
    {date: '2026-11-10', title: 'CVP TBL 4', course: 'CVP'},
    {date: '2026-11-18', title: 'CVP Final Exam', course: 'CVP'},
    {date: '2026-11-19', title: 'CVP OSPE', course: 'CVP'},
    {date: '2026-12-20', title: 'MOL Final', course: 'MOL'}
  ], [{course: 'CVP'}, {course: 'MOL'}]);
  assert.equal(ctx.courseEndDates().CVP, '2026-11-19');
  assert.equal(ctx.courseClosed('CVP', '2026-11-19'), false);
  assert.equal(ctx.courseClosed('CVP', '2026-11-20'), true);
  assert.equal(ctx.courseClosed('MOL', '2026-11-23'), false);
});

test('a course with no final on the calendar is never closed', () => {
  const ctx = load([{date: '2026-11-10', title: 'ANAT TBL 1', course: 'ANAT'}], [{course: 'ANAT'}]);
  assert.equal(ctx.courseClosed('ANAT', '2030-01-01'), false);
});

test('every scheduler skips closed courses', () => {
  for (const [file, needle] of [
    ['public/app.js', 'courseClosed(t.x.course)'],
    ['public/app.js', 'Study.closedCourseFilter'],
    ['public/study-autopilot.js', 'reviewCourseClosed'],
    ['public/schedule-ui.js', 'reviewCourseClosed'],
    ['public/profile-entry.js', 'reviewCourseClosed']
  ]) assert.ok(readFileSync(new URL('../' + file, import.meta.url), 'utf8').includes(needle), `${file} uses ${needle}`);
});
