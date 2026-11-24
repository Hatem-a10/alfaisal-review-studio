import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const current=read('public/hub-upgrade.css');
const previous=current.replace(/\/\* A5-038:[\s\S]*?@media print \{\s*\.material-list \{ content-visibility:visible; contain-intrinsic-size:none; \}\s*\}\s*/, '');
test('A5-038 offscreen Library sections retain their DOM, accessible links and source order',()=>{
 const markup=read('public/library-list.js');
 assert.match(markup,/<section class="material-list">/);
 assert.match(markup,/libraryDocumentURL\(source, page,snapshot.lookup\)/);
 assert.match(markup,/\bcovered\.add\(source\.id\)/);
 assert.equal(current.replace(/\/\* A5-038:[\s\S]*?@media print \{\s*\.material-list \{ content-visibility:visible; contain-intrinsic-size:none; \}\s*\}\s*/,''),previous);
 const oldSelectors=new Set([...previous.matchAll(/\.material-list(?:\s|\.|\{|\:|>)/g)].map(x=>x[0]));
 assert.ok(oldSelectors.size>0);
});
test('A5-038 guarded content visibility only affects independent Library groups, never OSPE or exams',()=>{
 const region=current.slice(current.indexOf('/* A5-038:'),current.indexOf('.material-list { margin: 24px 0; }'));
 assert.match(region,/@supports \(content-visibility:auto\)/);
 assert.match(region,/\.material-list \{ content-visibility:auto; contain-intrinsic-size:auto 660px;/);
 assert.match(region,/@media print \{[\s\S]*content-visibility:visible; contain-intrinsic-size:none;/);
 assert.doesNotMatch(region,/\.xp-|\.ospe|\.guide-section|\.question/);
 const built=transformSync(current,{loader:'css',minify:true,target:'safari16.4',legalComments:'none'}).code;
 assert.ok(built.includes('content-visibility:auto'));
 assert.ok(built.includes('contain-intrinsic-size:auto 660px'));
 assert.ok(built.includes('@media print'));
 console.log(JSON.stringify({label:'A5-038 isolated offscreen Library sections',targetSelector:'.material-list',affectedExamViews:0,printOverride:true,semanticDOMChanges:0}));
});
