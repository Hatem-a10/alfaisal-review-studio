import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveAccent } from '../public/phase1-accent.mjs';

function rgb(hex) { return hex.slice(1).match(/../g).map(v => parseInt(v, 16)); }
function lum(color) {
  const channel = v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  return .2126 * channel(color[0]) + .7152 * channel(color[1]) + .0722 * channel(color[2]);
}
function ratio(a, b) { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); }

test('semantic foreground, hover, text accent and borders meet contrast targets across custom hues', () => {
  for (const dark of [false, true]) for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
    const raw = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    const tokens = deriveAccent(raw, dark), surface = dark ? '#000000' : '#ffffff';
    assert.equal(tokens['--accent'], raw);
    assert.ok(ratio(rgb(tokens['--accent-fg']), rgb(raw)) >= 4.5, `${raw} fill foreground`);
    assert.ok(ratio(rgb(tokens['--on-accent']), rgb(tokens['--accent-hover'])) >= 4.5, `${raw} hover foreground`);
    assert.ok(ratio(rgb(tokens['--accent-text']), rgb(tokens['--accent-selected'])) >= 4.5, `${raw} selected foreground`);
    assert.ok(ratio(rgb(tokens['--accent-text']), rgb(surface)) >= 4.5, `${raw} readable accent`);
    assert.ok(ratio(rgb(tokens['--accent-border']), rgb(surface)) >= 3, `${raw} border`);
  }
});

test('invalid accents fall back safely and compatibility properties are returned', () => {
  const tokens = deriveAccent('not-a-color', false);
  assert.equal(tokens['--accent'], '#5b4bd0');
  assert.equal(tokens['--green'], tokens['--accent-text']);
  assert.equal(tokens['--on-accent'], tokens['--accent-fg']);
});

test('site settings opens with its close control focused and preserves live sync status nodes', () => {
  const src = fs.readFileSync('public/admin-panel.js', 'utf8');
  assert.match(src, /closeButton\.autofocus=true/);
  assert.match(src, /closeButton\.focus\(\{preventScroll:true\}\)/);
  assert.match(src, /const saveLabel=document\.getElementById\('saveLabel'\);if\(saveLabel\)saveLabel\.hidden=true/);
  assert.match(src, /document\.getElementById\('saveLabel'\)/);
  assert.doesNotMatch(src, /(?:remove|replace)Child\([^)]*syncState/); // Existing live/error status remains in the sync widget.
  assert.match(src, /\.dataset\.quickAction='sync'/);
  assert.match(src, /\.dataset\.quickAction='settings'/);
});
