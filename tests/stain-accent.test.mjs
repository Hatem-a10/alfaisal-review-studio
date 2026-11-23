import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('public/redesign.css');
const runtime = read('public/phase1-runtime.mjs');

test('default accent follows the next assessment stain and matches the CSS palettes', () => {
  const accents = JSON.parse(runtime.match(/STAIN_ACCENTS=(\[[^\]]+\])/)[1].replace(/'/g, '"'));
  assert.equal(accents.length, 8);
  accents.forEach((hex, i) => {
    assert.match(css, new RegExp(`\\.assessment-theme-${i},\\.stain-${i}\\)\\{--st-a:#[0-9a-f]{6};--st-b:${hex}`), `card palette ${i}`);
    if (i) assert.match(css, new RegExp(`data-stain="${i}"\\] body:not\\(\\.xp-exam-active\\)\\{--ax-a:#[0-9a-f]{6};--ax-b:${hex}`), `site palette ${i}`);
  });
  assert.match(runtime, /custom\?settings\.accent:STAIN_ACCENTS\[stain\]/);
  assert.match(runtime, /DEFAULT_ACCENTS=\/\^#\(\?:5b4bd0\|2f6c52\)\$\/i/);
});

test('one stain per assessment is shared by the home card and countdown cards', () => {
  assert.match(read('public/studio-redesign.js'), /window\.reviewStainFor=event=>/);
  assert.match(read('public/hub-upgrade.js'), /stain-\$\{window\.reviewStainFor\?\.\(e\)\?\?/);
});

test('no blocked third-party font requests remain', () => {
  assert.doesNotMatch(read('public/style.css'), /@import/);
  assert.doesNotMatch(read('public/index.html'), /fonts\.googleapis|fonts\.gstatic/);
});
