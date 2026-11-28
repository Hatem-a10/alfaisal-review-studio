import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../public/dialog-focus-recovery.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('focus recovery is loaded before startup and restores the real opener',()=>{
 {const focus=html.indexOf('dialog-focus-recovery.js?v='),startup=html.indexOf('startup-ready.js?v=');assert.ok(focus>=0&&startup>focus)}
 assert.match(src,/document.addEventListener\('close',e=>/);
 assert.match(src,/returnTargets\.set\(dialog,opener\)/);
 assert.match(src,/queueMicrotask\(\(\)=>restore\(e\.target\)\)/);
 assert.match(src,/valid\(preferred\)\?preferred/);
});
test('native modal keyboard behavior is preserved and repaired only when focus left outside',()=>{
 assert.match(src,/dialog\.matches\?\.\(':modal'\)/);
 assert.match(src,/dialog\.querySelector\('\[autofocus\]/);
 assert.doesNotMatch(src,/preventDefault|stopPropagation|\.showModal\s*=|\.close\s*=/);
 assert.match(src,/attributeFilter:\['open'\]/);
});
