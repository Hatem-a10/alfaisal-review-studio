import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { declutter } from '../public/phase1-copy.mjs';

function paragraph(step, text) {
  return {
    textContent: text,
    removed: false,
    parentElement: { getAttribute: name => name === 'data-step' ? step : null },
    remove() { this.removed = true; },
  };
}

function container(paragraphs) {
  return { querySelectorAll: selector => {
    if (selector === '.intro > div > p') return [];
    assert.equal(selector, '.student-welcome [data-step] > p');
    return paragraphs;
  }};
}

test('declutter removes only the two exact repeated welcome wizard subtitles', () => {
  const welcome = paragraph('0', 'Set up your study space in a few steps.');
  const appearance = paragraph('2', 'Choose your accent and appearance.');
  const paragraphs = [welcome, appearance];
  assert.equal(declutter(container(paragraphs)), 2);
  assert.equal(welcome.removed, true);
  assert.equal(appearance.removed, true);
});

test('declutter preserves useful or changed copy and safely accepts missing containers', () => {
  const progress = paragraph('3', 'Mark reviews you have already completed. They will be recorded at setup time.');
  const finish = paragraph('5', 'Your profile and review plan are ready. You can change your preferences later in Settings.');
  const changed = paragraph('0', 'Set up your study space in a few steps today.');
  assert.equal(declutter(container([progress, finish, changed])), 0);
  assert.equal([progress, finish, changed].some(p => p.removed), false);
  assert.equal(declutter(null), 0);
});

test('visual layer covers profile wizard, grade solver and search labels without generic copy hiding', () => {
  const css = fs.readFileSync('public/phase1-ui.css', 'utf8');
  for (const selector of ['.student-appearance', '.student-progress-row', '.student-wizard-progress', '.target-solver', '#phase1Search']) {
    assert.ok(css.includes(selector), `missing responsive styling for ${selector}`);
  }
  assert.doesNotMatch(css, /\.muted\s*\{[^}]*display\s*:\s*none/i);
  assert.doesNotMatch(css, /\.section-sub\s*\{[^}]*display\s*:\s*none/i);
});

test('only repeated self-explanatory intro copy is removed; grading and timing assumptions remain',()=>{const p={textContent:'Open complete slides and transcriptions, or add original files to a lecture.',remove(){this.removed=true}},assumption={textContent:'Recorded work only. Scheduled reviews do not count.',remove(){this.removed=true}};assert.equal(declutter({querySelectorAll:s=>s.startsWith('.intro')?[p,assumption]:[]}),1);assert.equal(p.removed,true);assert.equal(assumption.removed,undefined)});
