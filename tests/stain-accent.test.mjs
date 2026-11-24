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
  assert.match(runtime, /color=palette\?palette\.b:STAIN_ACCENTS\[stain\]/);
  assert.match(read('public/app.js'), /accentAuto:typeof s\?\.accentAuto==='boolean'/);
  assert.match(read('public/learning.js'), /settings\.accentAuto=false/);
  assert.match(css, /data-accent=palette\] body:not\(\.xp-exam-active\)\{--ax-a:var\(--pal-a\);--ax-b:var\(--pal-b\);--ax-c:var\(--pal-c\)\}/);
  assert.match(runtime, /DEFAULT_ACCENTS=\/\^#\(\?:5b4bd0\|2f6c52\)\$\/i/);
});

test('every stain has its own histology image', () => {
  for (let i = 0; i < 8; i++) assert.match(css, new RegExp(`\\.assessment-theme-${i},\\.stain-${i}\\)\\{--st-img:url\\("data:image/svg`));
  const images = [...css.matchAll(/--st-img:(url\("[^"]+"\))/g)].map(m => m[1]);
  assert.equal(new Set(images.slice(1)).size, 8);
});

test('one stain per assessment is shared by the home card and countdown cards', () => {
  assert.match(read('public/studio-redesign.js'), /window\.reviewStainFor=event=>/);
  assert.match(read('public/hub-upgrade.js'), /stain-\$\{globalThis\.reviewStainFor\?\.\(e\)\?\?/);
});

test('no blocked third-party font requests remain', () => {
  assert.doesNotMatch(read('public/style.css'), /@import/);
  assert.doesNotMatch(read('public/index.html'), /fonts\.googleapis|fonts\.gstatic/);
});
