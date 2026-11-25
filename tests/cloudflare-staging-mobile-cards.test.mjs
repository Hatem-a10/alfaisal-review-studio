import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const schedule=readFileSync(new URL('../public/schedule-ui.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../public/admin-control-center.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/admin-control-center.css',import.meta.url),'utf8');
test('mobile timetable derives assigned session cards from the same group-filtered events',()=>{
 assert.match(schedule,/eventsByDate\.get\(day\)\|\|\[\]/);
 assert.match(schedule,/\.sort\(\(a,b\)=>a\.start-b\.start\)/);
 assert.match(schedule,/data-campus-event=".*esc\(e\.id\)/);
 assert.match(schedule,/esc\(label\.title\)/);
 assert.match(schedule,/schedule-mobile-agenda/);
});
test('Admin mobile card labels attach to existing column titles',()=>{
 assert.match(admin,/items\.entries\(\)/);
 assert.match(admin,/cell\.setAttribute\('data-label',String\(columns\[index\]\|\|''\)\)/);
 assert.match(css,/content:attr\(data-label\)/);
 assert.match(css,/@media\(max-width:600px\)/);
});
