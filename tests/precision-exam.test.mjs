import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/examplify-mode.js',import.meta.url),'utf8');

test('Examplify selected-answer mark replaces the eye control and shortcuts live in Practice instructions',()=>{
 assert.match(source,/class="xp-option-mark \$\{answer===j\?'xp-option-mark-selected':''\}"/);
 assert.match(source,/\$\{answer===j\|\|struck\.includes\(j\)\?selectedAnswerIcon\(\):examEyeIcon\(false\)\}/);
 assert.doesNotMatch(source,/xp-choice-check/);
 assert.match(source,/data-xp-action="notice">Practice instructions/);
 assert.doesNotMatch(source,/class="xp-shortcuts"/);
 assert.match(source,/document\.querySelector\('\[data-xp-action=notice\]'\)\?\.click\(\)/);
 const start=source.indexOf('function practiceNotice()');
 const end=source.indexOf('\n function calculatorMarkup',start);
 assert.ok(start>=0&&end>start,'practice instructions renderer exists');
 const render=vm.runInNewContext('('+source.slice(start,end).trim()+')',{isOriginal:()=>false});
 const html=render();
 for(const key of ['Keyboard shortcuts','A–E','1–8','flag or unflag','these instructions'])assert.ok(html.includes(key),key);
});

test('Examplify calculator evaluates keyboard-mode roots and powers',()=>{
 const start=source.indexOf('function calculate(expression)');
 const end=source.indexOf('\n function calcKey',start);
 assert.ok(start>=0&&end>start,'calculator evaluator exists');
 const calculate=vm.runInNewContext('('+source.slice(start,end)+')');
 assert.equal(calculate('8 + √(9)'),11);
 assert.equal(calculate('2^3^2'),512);
 assert.equal(calculate('2×√(16)÷4'),2);
 assert.throws(()=>calculate('√(-1)'),/Invalid calculation/);
 assert.throws(()=>calculate('√(9'),/Close parentheses/);
});
