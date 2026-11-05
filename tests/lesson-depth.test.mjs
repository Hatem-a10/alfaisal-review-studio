import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

const load = name => fs.readFileSync('public/' + name, 'utf8');
const pack = vm.runInNewContext(load('lesson-depth-data.js') + ';LESSON_DEPTH');
const apply = vm.runInNewContext(load('lesson-depth-core.js') + ';applyLessonDepth');
const {learning, teaching} = assembledLearning();

test('lesson expansion keeps existing topics, opens new guides with teaching, and is idempotent', () => {
  const lecture = learning.lessons.find(item => item.id === 'CVP-A22');
  const guide = teaching.guides[lecture.id];
  assert.match(guide.overview, /Provisional guide/);
  assert.equal(guide.sections[0].id, 'CVP-A22:cardinal');
  for (const fact of lecture.facts) assert.ok(guide.sections.some(section => section.id === fact.id));
  const length = learning.questions.length;
  const teachingBefore = JSON.stringify(teaching);
  const sourcesBefore = learning.sources.length;
  apply(learning, teaching, {}, {}, pack);
  assert.equal(learning.questions.length, length);
  assert.equal(JSON.stringify(teaching), teachingBefore);
  assert.equal(learning.sources.length, sourcesBefore);
});

test('new teaching and question citations resolve to a page and questions retain choice feedback', () => {
  const sources = new Map(learning.sources.map(source => [source.id, source]));
  const ids = new Set();
  for (const [lectureId, change] of Object.entries(pack.lessons)) {
    for (const addition of change.sections) {
      const actual = teaching.guides[lectureId].sections.find(section => section.id === addition.id);
      assert.ok(actual?.body.includes(addition.body[0]), addition.id);
      for (const ref of addition.references) {
        assert.ok(sources.get(ref.source)?.pages.some(page => page.page === ref.page), JSON.stringify(ref));
      }
      for (const q of addition.questions) {
        assert.ok(!ids.has(q.id), q.id);
        ids.add(q.id);
        assert.equal(q.options.length, q.reasons.length);
        assert.equal(q.explanation, q.reasons[q.answer]);
      }
    }
  }
  const shared = learning.sources.filter(source => source.id === 'cvp-pulm-t-p20');
  assert.equal(shared.length, 1);
  assert.ok(!learning.sources.some(source => source.id === 'depth-t-7'));
});
