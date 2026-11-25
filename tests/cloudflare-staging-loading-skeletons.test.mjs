import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const s=readFileSync(new URL('../public/course-packs.js',import.meta.url),'utf8'),start=s.indexOf('function courseLoadingMarkup('),end=s.indexOf(' // Views that show no course content',start);
const make=runInNewContext(s.slice(start,end)+';courseLoadingMarkup',{esc:v=>v.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))});
test('loading panels render course-neutral skeletons and never invent lecture details',()=>{
 const markup=make(['REN','MOL','<img>']);
 assert.match(markup,/role="status" aria-live="polite" aria-busy="true"/);
 assert.match(markup,/Opening REN and MOL/);assert.doesNotMatch(markup,/<img>/);
 assert.equal((markup.match(/course-load-row/g)||[]).length,4);
 assert.match(s,/content.innerHTML=courseLoadingMarkup(need)/);
});
test('loading skeleton animations respect reduced motion',()=>{
 const css=readFileSync(new URL('../public/phase1-ui.css',import.meta.url),'utf8');
 assert.match(css,/@media(prefers-reduced-motion:reduce)/);
 assert.match(css,/.course-load-skeleton>div{animation:none/);
});
