import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {transformSync} from 'esbuild';

const root = new URL('../public/', import.meta.url);
const css = readFileSync(new URL('redesign.css', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');

// Flatten nesting the same way the production style build does, then inspect every selector.
const flat = transformSync(css, {loader: 'css', target: 'safari16.4'}).code;
const selectors = [...flat.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|})\s*([^{}@\s][^{}]*)\{/g)]
  .map(m => m[2].trim()).filter(s => s && !/^(from|to|\d+%)$/.test(s));

const splitTopLevel = text => {
  const parts = []; let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  return [...parts, text.slice(start)];
};

test('every redesign rule is scoped away from a running Examplify exam', () => {
  assert.ok(selectors.length > 40, 'expected the design layer to contain rules');
  for (const group of selectors) {
    for (const selector of splitTopLevel(group)) {
      assert.match(selector.trim(), /body:not\(\.xp-exam-active\)/, `unscoped selector: ${selector.trim()}`);
    }
  }
  assert.doesNotMatch(css, /#xpExam|\.xp-(?!exam-active)/, 'the design layer must not target Examplify elements');
});

test('redesign loads last and its self-hosted fonts exist', () => {
  const sheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?]+)/g)].map(m => m[1]);
  assert.equal(sheets.at(-1), 'redesign.css');
  for (const font of [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map(m => m[1])) {
    assert.ok(existsSync(new URL('.' + font, root)), `missing font ${font}`);
  }
  assert.ok(existsSync(new URL('fonts/LICENSE-schibsted-grotesk.txt', root)));
  assert.match(html, /rel="preload" href="\/fonts\/schibsted-grotesk-latin-wght-normal\.woff2" as="font" type="font\/woff2" crossorigin/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com\/css2\?family=Atkinson/);
});

test('redesign respects reduced motion and keeps visible keyboard focus', () => {
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible\{outline:2px solid var\(--accent\)/);
});
