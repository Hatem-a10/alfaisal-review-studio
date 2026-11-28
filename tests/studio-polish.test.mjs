import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {runInNewContext} from 'node:vm';
const read=f=>fs.readFileSync(f,'utf8');
test('desktop uses the profile for Home and exposes Countdowns and Booklet in order',()=>{const s=read('public/studio-navigation.js');assert.match(s,/nav.replaceChildren\(\.\.\.desktop,other\)/);assert.match(s,/\['Resources',\[\{id:'library',label:'Library'[^\n]*id:'archive'/);assert.match(s,/\['Study',\[\s*\.\.\.\(anatomy\?\[toolFrom\(anatomy\)\]:\[\]\),\s*(?:microscope,\s*)?\{id:'anki'/);assert.doesNotMatch(s,/\['Practice',\[/);assert.doesNotMatch(s,/Content sources/);assert.match(s,/#other\//);assert.match(s,/popstate/);assert.match(s,/mobile\.replaceChildren\(\.\.\.shortcuts,more\)/);assert.match(s,/const mobileRoutes=\['dashboard','learning','practice','calendar'\]/);assert.match(s,/const desktopRoutes=\[\['learning'[\s\S]*?\['countdowns','Countdowns','hourglass'\],\['booklet','Booklet','booklet'\]\]/);assert.match(s,/mobileLayout.matches\|\|!desktopOnly.includes\(tool.id\)/)});
test('each Learning area uses the same icon-bearing switch',()=>{const entry=read('public/ospe-entry.js');assert.match(entry,/learning:navGlyph\('book'\)/);for(const f of ['public/labs.js','public/ospe.js'])assert.match(read(f),/learningAreaTabs/)});
test('published version badge matches the declared release and build metadata',()=>{const release=JSON.parse(read('public/site-release.json')),html=read('public/index.html');assert.match(release.displayVersion,/^v\d+\.\d{2,3}$/);assert.ok(html.includes('title="Site version '+release.siteVersion+'">'+release.displayVersion));assert.match(read('scripts/site-build-info.mjs'),/siteVersion:release.siteVersion/)});
test('text-only enlargement links and explicit caption buttons resolve their own figure',()=>{const s=read('public/workspace-refinements.js');assert.match(s,/imageLink/);assert.match(s,/trigger\?\.dataset.imageSrc/);assert.match(s,/closest\('figure'\)\?\.querySelector\('img'\)/);assert.match(read('public/learning-ui.js'),/data-image-src=.*Enlarge diagram/)});
test('expanded rail is wider while compact, collapsed and phone dimensions retain their existing rules',()=>{const css=read('public/studio-navigation.css');assert.match(css,/width:282px!important/);assert.match(css,/margin-left:282px!important/);assert.match(css,/@media\(min-width:761px\)/);assert.match(css,/min-height:55px!important/)});

test('lecture lists can render while a course pack is deferred',()=>{
 const source=read('public/learning.js'),start=source.indexOf('function learningStatus(');
 const status=runInNewContext(source.slice(start,source.indexOf('\n',start))+';learningStatus',{
  LEARNING:{lessons:[]},Learn:{status(){throw Error('A lesson must be loaded to compute mastery');}},
 });
 const pending=status('MOL-1');
 assert.equal(pending.passed,false);
 assert.equal(pending.pending,true);
 assert.equal(pending.label,'Open the lesson to load progress');
});
