import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

const load = name => fs.readFileSync('public/' + name, 'utf8');
const pack = vm.runInNewContext(load('lesson-depth-data.js') + ';LESSON_DEPTH');
const apply = vm.runInNewContext(load('lesson-depth-core.js') + ';applyLessonDepth');
const {learning, teaching} = assembledLearning();
const applyExpansion=vm.runInNewContext(load('lesson-expansion.js')+';applyLessonExpansion');
const expansion=JSON.parse(load('lesson-expansion-data.json'));

test('lesson expansion keeps existing topics, opens new guides with teaching, and is idempotent', () => {
  const lecture = learning.lessons.find(item => item.id === 'CVP-A22');
  const guide = teaching.guides[lecture.id];
  assert.match(guide.overview, /embryonic venous channels/i);
  assert.equal(guide.sections[0].id, 'CVP-A22:cardinal');
  for (const fact of lecture.facts) assert.ok(guide.sections.some(section => section.id === fact.id));
  // Reapplying an early expansion after later transcript enrichments is not the runtime order.
  // Test stage idempotence on isolated copies, without mutating the assembled bank used below.
  const l=JSON.parse(JSON.stringify(learning)),t=JSON.parse(JSON.stringify(teaching));
  const length=l.questions.length,sourcesBefore=l.sources.length;
  apply(l,t,{}, {},pack);
  const afterDepth=JSON.stringify(t);
  apply(l,t,{}, {},pack);
  assert.equal(JSON.stringify(t),afterDepth);
  applyExpansion(l,t,{},expansion);
  const afterExpansion=JSON.stringify(t);
  applyExpansion(l,t,{},expansion);
  assert.equal(l.questions.length,length);
  assert.equal(JSON.stringify(t),afterExpansion);
  assert.equal(l.sources.length,sourcesBefore);
});

test('new teaching and question citations resolve to a page and questions retain choice feedback', () => {
  const sources = new Map(learning.sources.map(source => [source.id, source]));
  const ids = new Set();
  for (const [lectureId, change] of Object.entries(pack.lessons)) {
    for (const addition of change.sections) {
      const actual = teaching.guides[lectureId].sections.find(section => section.id === addition.id);
      const expected=expansion[lectureId]?.sections[addition.id]?.body[0]??addition.body[0];
      assert.ok(actual?.body.includes(expected), addition.id);
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

test('citations for extracted readings open the correct page in the library', () => {
  const source = load('learning.js');
  const start = source.indexOf('function sourcePageURL(');
  const end = source.indexOf('function provisionalGuide(', start);
  const sourceLink = vm.runInNewContext(source.slice(start, end) + ';sourceLink', {
    sourceTarget: () => ({s: {name: 'Coronary slides'}, url: '#library', label: 'slide 14'}),
    esc: String,
  });
  const markup = sourceLink({source: 'cvp-w2-slides-1', page: 14});
  assert.match(markup, /data-open-page="cvp-w2-slides-1"/);
  assert.match(markup, /data-page="14"/);
  assert.doesNotMatch(markup, /#library#page/);
});
