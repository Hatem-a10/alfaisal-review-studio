import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSESSMENT_GRADIENTS,gradientById} from '../public/accent-gradients.mjs';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('public/redesign.css');
const runtime = read('public/phase1-runtime.mjs');

test('assessment cards and Auto share the picker palette and keep distinct category tones', () => {
  const palettes=ASSESSMENT_GRADIENTS.map(gradientById);
  assert.equal(palettes.length,8);
  assert.equal(new Set(palettes.map(item=>item.b)).size,8);
  assert.match(runtime, /const palette=auto\?assessmentPalettes\[stain\]/);
  assert.match(runtime, /const category=assessmentPalettes\[index\]/);
  assert.match(css, /--ax-a:var\(--pal-a,/);
  assert.match(read('public/app.js'), /accentAuto:typeof s\?\.accentAuto==='boolean'/);
  assert.match(read('public/learning.js'), /settings\.accentAuto=false/);
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
