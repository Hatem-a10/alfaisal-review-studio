import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('A5-126 timetable event lanes are grouped and sorted once per day',()=>{
 const line=source('schedule-ui.js').split('\n').find(l=>l.startsWith('function campusLayout('));
 assert.match(line,/days=new Map\(\)/);
 assert.match(line,/for\(const rows of days.values\(\)\)\{const ordered=rows.slice\(\).sort\(/);
});
test('A5-158 original exam explanation markup is conditional on completed run',()=>{
 const line=source('original-exams.js').split('\n').find(l=>l.startsWith('function originalQuestionMarkup('));
 assert.match(line,/done=!!run.finishedAt/);
 assert.match(line,/\$\{done\?\x60<div class="answer-feedback /);
});
test('A5-163/A5-167 OSPE pools and score already run through bounded per-circuit loops',()=>{
 const code=source('ospe-core.mjs');
 assert.match(code,/const pools=new Map\(\);for\(const s of stations\)/);
 assert.match(code,/score\(run,stations\)\{const byId=stationMap\(stations\),seen=new Set\(\)/);
 assert.match(code,/for\(const slot of Array.isArray\(run\?\.slots\)\?run.slots:\[\]\)/);
});
test('A5-168 OSPE review displays only selected image',()=>{
 const review=source('ospe.js').split('\n').find(l=>l.startsWith(' function review('));
 assert.match(review,/const slots=run.slots.filter\(x=>x.station\),s=lookup\(/);
 assert.equal((review.match(/stationFigure\(/g)||[]).length,1);
});
test('A5-170 OSPE tick repaints on station change, otherwise only timer text',()=>{
 const tick=source('ospe.js').split('\n').find(l=>l.includes('setInterval(()=>{if(!run||run.finished)'));
 assert.match(tick,/if\(p.index!==lastIndex\)/);
 assert.match(tick,/if\(active\(\)\)\{paint\(\);top\(\)\}/);
 assert.match(tick,/else if\(active\(\)\)\{const el=document.querySelector\('#ospeClock'\)/);
});
test('A5-174 active Anki card view bypasses deck-library enumeration',()=>{
 const page=source('anki.js').split('\n').find(l=>l.startsWith('function ankiPage()'));
 assert.match(page,/^function ankiPage\(\)\{if\(ankiDeck\)\{/);
 assert.ok(page.indexOf('const localCloudIds=')>page.indexOf('return intro('));
});
test('A5-219 startup preloads one essential font rather than full font catalog',()=>{
 const html=source('index.html');
 const fonts=html.match(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/g)||[];
 assert.equal(fonts.length,1);
});
