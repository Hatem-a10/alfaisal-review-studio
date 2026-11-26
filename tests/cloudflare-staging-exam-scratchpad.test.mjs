import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/examplify-mode.js','utf8');
test('Examplify omits notes and exposes practice instructions only through Exam Controls',()=>{
 assert.match(source,/highlighted\(q\.caseText,'case'\)/);
 assert.doesNotMatch(source,/scratchpad|xpNotes|data-xp-action="scratch"/i);
 assert.equal([...source.matchAll(/data-xp-action="notice"/g)].length,1);
 const controls=source.match(/<details class="xp-controls">([\s\S]*?)<\/details>/)?.[1]??'';
 assert.match(controls,/<summary>[\s\S]*?Exam controls[\s\S]*?<\/summary>/);
 assert.match(controls,/<button type="button" data-xp-action="notice">Practice instructions/);
});
