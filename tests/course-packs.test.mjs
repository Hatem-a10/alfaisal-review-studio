import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {deferSourceReading} from '../scripts/source-demand.mjs';
import {SPLIT_DATA, PACK_COURSES, COURSE_SCRIPTS, parseLiteral, splitData, coreDataSource, preludeSource, depthReplay, lectureCourse} from '../scripts/course-packs.mjs';

const root = new URL('..', import.meta.url).pathname;
const read = f => readFileSync(path.join(root, 'public', f), 'utf8');
const runtime = read('course-packs.js');

// Real course data, exactly as the bundler sees it.
function realData() {
  const lab = JSON.parse(read('lab-curriculum.json')).sources.map(s => ({...s, pages: s.readingURL ? JSON.parse(read(s.readingURL)) : s.pages}));
  const data = {};
  for (const [file, {name}] of Object.entries(SPLIT_DATA)) {
    let src = read(file);
    if (file === 'learning-data.js') src = deferSourceReading(src, mkdtempSync(path.join(tmpdir(), 'packs-')), lab);
    data[name] = parseLiteral(file, src, name);
  }
  return data;
}

// Boot the core data, then merge course packs in the given order, using the browser runtime's merge code.
function rebuild(data, order) {
  const {core, packs, order: ords} = splitData(data);
  const ctx = vm.createContext({structuredClone});
  vm.runInContext(preludeSource({}) + Object.entries(SPLIT_DATA).map(([, {name}]) => coreDataSource(name, core[name], ords)).join('\n') + '\n' + runtime.split('(()=>{')[0], ctx);
  for (const course of order) for (const [p, {kind, entries}] of Object.entries(packs[course])) {
    vm.runInContext(`__reviewMerge${kind === 'array' ? 'Array' : 'Keys'}(${JSON.stringify(p)},${p},${JSON.stringify(entries)})`, ctx);
  }
  return Object.fromEntries(Object.values(SPLIT_DATA).map(({name}) => [name, JSON.parse(vm.runInContext(`JSON.stringify(${name})`, ctx))]));
}

test('loading every course pack restores the original data exactly, in either order', () => {
  const data = realData();
  const original = JSON.parse(JSON.stringify(data));
  for (const order of [PACK_COURSES, [...PACK_COURSES].reverse()]) {
    const rebuilt = rebuild(data, order);
    for (const name of Object.keys(original)) assert.deepEqual(rebuilt[name], original[name], `${name} after loading ${order.join(' then ')}`);
  }
});

test('the core alone holds no lecture content from a packed course', () => {
  const {core} = splitData(realData());
  const leaks = [...core.LEARNING.lessons, ...core.LEARNING.questions].filter(x => (x.lectureIds || [x.id]).some(lectureCourse));
  assert.deepEqual(leaks.map(x => x.id), []);
  assert.deepEqual(Object.keys(core.TEACHING.guides).filter(lectureCourse), []);
});

test('course pack scripts and depth replay stay course-scoped', () => {
  const owned = Object.values(COURSE_SCRIPTS).flat();
  assert.equal(new Set(owned).size, owned.length, 'a script belongs to one course');
  const index = read('index.html');
  for (const file of owned) assert.ok(index.includes('data-src="' + file), file + ' is still a startup script');
  assert.ok(index.indexOf('data-src="course-packs.js') > index.indexOf('data-src="cvp19-entry.js'), 'loader wraps render last');
  const depth = read('lesson-depth-runtime.js');
  const entries = {'LESSON_DEPTH.lessons': {entries: [[0, 'MOL-20', {}]]}};
  assert.doesNotMatch(depthReplay('MOL', depth, entries), /drill-CVP-A6/, 'MOL replay leaves CVP edits alone');
  assert.match(depthReplay('CVP', depth, entries), /drill-CVP-A6/);
  assert.doesNotMatch(depthReplay('MOL', depth, entries), /applyLessonDepth\(LEARNING, TEACHING, TOPIC_CHECKS, DIAGRAMS, LESSON_DEPTH\)/, 'never replays other courses');
});

test('merging keeps boot-time additions after the original entries', () => {
  const ctx = vm.createContext({});
  vm.runInContext(preludeSource({}) + runtime.split('(()=>{')[0] + `
   const list=[{id:'a'},{id:'c'}];__reviewOrder('L',list,[0,2]);list.push({id:'pushed'});
   __reviewMergeArray('L',list,[[1,{id:'b'}],[3,{id:'d'}]]);
   const keys={a:1,c:3};__reviewOrder('K',keys,[0,2]);keys.late=9;
   __reviewMergeKeys('K',keys,[[1,'b',2]]);
   globalThis.out=JSON.stringify({list:list.map(x=>x.id),keys:Object.keys(keys)});`, ctx);
  assert.deepEqual(JSON.parse(ctx.out), {list: ['a', 'b', 'c', 'd', 'pushed'], keys: ['a', 'b', 'c', 'late']});
});
