import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHTML} from '../public/html-escape.mjs';
import {readFileSync} from 'node:fs';
test('shared HTML helper escapes all five markup characters and preserves text and zero',()=>{assert.equal(escapeHTML('&<>"\''),'&amp;&lt;&gt;&quot;&#39;');assert.equal(escapeHTML(null),'');assert.equal(escapeHTML(undefined),'');assert.equal(escapeHTML(0),'0');assert.equal(escapeHTML('Na⁺ / العربية'),'Na⁺ / العربية');});
test('authored modules use one escape implementation',()=>{for(const name of ["study-next.mjs","phase3-runtime.mjs","formulas-practice.mjs","lesson-formula-drills.mjs","phase2-practice.mjs"])assert.match(readFileSync(new URL('../public/'+name,import.meta.url),'utf8'),/from '\.\/html-escape\.mjs'/);});
