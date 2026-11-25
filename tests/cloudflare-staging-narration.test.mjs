import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

function fixture() {
  const listeners = {};
  const context = vm.createContext({
    sectionCard: () => '<article><p>Teaching</p></article>',
    sourceById: id => id === 'slides' ? {pages: [{page: 3, audio: ['/clip.mp3']}]} : null,
    sourceLink: ref => '<a href="/slides.pdf#page=' + ref.page + '">Open source</a>',
    esc: value => String(value),
    document: {addEventListener: (name, handler) => { listeners[name] = handler; }}
  });
  vm.runInContext(readFileSync(new URL('../public/cvp-topic-media.js', import.meta.url), 'utf8'), context);
  return {context, listeners};
}

test('CVP narration shows explicit source links and five playback speeds', () => {
  const {context} = fixture();
  const html = context.sectionCard({id: 'CVP-P1'}, {references: [{source: 'slides', page: 3}]}, 0);
  assert.match(html, /src="\/clip\.mp3"/);
  assert.match(html, /href="\/slides\.pdf#page=3"/);
  for (const rate of ['1', '1.25', '1.5', '1.75', '2']) assert.ok(html.includes('value="' + rate + '"'));
  assert.match(html, /<details class="topic-narration">/);
  assert.match(html, /<\/details><\/article>$/);
});

test('non-CVP and absent narration leave the original teaching intact', () => {
  const {context} = fixture();
  const section = {references: [{source: 'slides', page: 3}]};
  assert.equal(context.sectionCard({id: 'REN-A1'}, section, 0), '<article><p>Teaching</p></article>');
  assert.equal(context.sectionCard({id: 'CVP-P1'}, {}, 0), '<article><p>Teaching</p></article>');
});

test('speed changes affect only the selected audio and reject unsupported values', () => {
  const {listeners} = fixture();
  const audio = {defaultPlaybackRate: 1, playbackRate: 1};
  const target = {matches: () => true, value: '1.75', closest: () => ({querySelector: () => audio})};
  listeners.change({target});
  assert.equal(audio.playbackRate, 1.75);
  assert.equal(audio.defaultPlaybackRate, 1.75);
  target.value = '9';
  listeners.change({target});
  assert.equal(audio.playbackRate, 1.75);
  assert.doesNotThrow(() => listeners.change({target: {matches: () => false}}));
});
