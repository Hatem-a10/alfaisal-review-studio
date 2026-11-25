import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonIndex} from '../public/phase2-image-zoom.mjs';
import {readFileSync} from 'node:fs';
test('comparison never selects the primary figure or a nonexistent figure',()=>{
 assert.equal(comparisonIndex(1,0,0),-1);assert.equal(comparisonIndex(2,0,0),1);
 assert.equal(comparisonIndex(3,2,2),0);assert.equal(comparisonIndex(4,0,3),3);
 assert.equal(comparisonIndex(4,0,100),1);assert.equal(comparisonIndex(4,-1,2),-1);
});
test('comparison uses only current exposed DOM figures and supports independent pane controls',()=>{
 const js=readFileSync(new URL('../public/phase2-image-zoom.mjs',import.meta.url),'utf8');
 assert.match(js,/const primary=figurePane/);assert.match(js,/const secondary=figurePane/);
 assert.match(js,/data-zoom="compare" aria-pressed="false" hidden/);
 assert.match(js,/n\.getClientRects\(\).length&&!n\.closest/);
 assert.match(js,/source\.cloneNode\(true\)/);
 assert.doesNotMatch(js,/fetch\(/);
 const css=readFileSync(new URL('../public/phase2-ui.css',import.meta.url),'utf8');
 assert.match(css,/\.phase2-light-figures \.phase2-zoom-viewport\{background:/);
 assert.match(css,/html\[data-theme=amoled\].*background-color:#f4f3f0/);
 assert.doesNotMatch(css,/filter:invert/);
});
