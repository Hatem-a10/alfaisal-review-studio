import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {visibleCatalogSets} from '../public/original-catalog.mjs';

const script = fileURLToPath(new URL('../scripts/append-renal-practice-questions.mjs', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');

test('Renal instructor practice retains keys, placement of visuals, IDs and existing assessments across appended imports', t => {
 const root = mkdtempSync(join(tmpdir(), 'renal-practice-'));
 t.after(() => rmSync(root, {recursive: true, force: true}));
 const image = {url: 'https://my.qbankmanager.com/media/synthetic.png', alt: 'Synthetic figure'};
 const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lGukAAAAASUVORK5CYII=', 'base64');
 writeFileSync(join(root, sha(image.url)+'.png'), bytes);
 const base = join(root, 'base.json'), intake = join(root, 'intake.json');
 const prior = {id: 'prior', ids: ['legacy']};
 writeFileSync(base, JSON.stringify({version: 1, sets: [prior], questions: [{id: 'legacy'}], sources: []}));
 const run = (input, name, rows) => {
  writeFileSync(intake, JSON.stringify([{id: 123, label: 'P1', rows}]));
  execFileSync(process.execPath, [script, input, intake, root, join(root, name)]);
  const file = join(root, name, 'interactive-assessments.json');
  return [file, JSON.parse(readFileSync(file, 'utf8'))];
 };
 const original = {question: '', options: ['First', 'Second'], acceptedAnswers: [1], explanation: 'Synthetic explanation.',
  images: [{...image, region:'question'}, {...image, region:'explanation'}]};
 const shuffled = {...original, options:['Second','First'], acceptedAnswers:[0]};
 const [first, a] = run(base, 'first', [original, shuffled]);
 const [, b] = run(first, 'second', [shuffled, {...shuffled, question:'New question'}]);
 assert.deepEqual(b.sets[0], prior);
 assert.equal(a.sets[1].ids.length, 1);
 assert.equal(b.sets[1].ids.length, 2);
 assert.deepEqual(b.questions[1], a.questions[1]);
 assert.equal(b.questions[1].answer, 1);
 assert.equal(b.questions[1].figures[0].caption, 'Question figure');
 assert.equal(b.questions[1].reviewFigures[0].caption, 'Explanation figure');
 assert.deepEqual(visibleCatalogSets([b.sets[1]], 'other', 'REN'), [b.sets[1]]);
 assert.deepEqual(visibleCatalogSets([b.sets[1]], 'tbl', 'REN'), []);
 assert.deepEqual(visibleCatalogSets([b.sets[1]], 'all', 'MOL'), []);
 assert.throws(() => run(first, 'invalid', [{...shuffled, acceptedAnswers:[1]}]), /Source answer changed/);
});

test('Question visuals stay visible in an attempt and explanation visuals appear only in review', () => {
 const source = readFileSync(new URL('../public/original-exams.js', import.meta.url), 'utf8');
 const markup = source.slice(source.indexOf('function originalFigureMarkup'), source.indexOf('const assessmentLoads'));
 const originalRun = {setId:'synthetic', answers:{q:0}};
 const context = vm.createContext({originalRun, esc:String, window:{}, repeatBadge:()=>'', decorateOptions:x=>x,
  ORIGINAL_EXAMS:{sources:[{id:'source', web:true, url:'https://example.test/practice', linkLabel:'Moodle practice set'}]}});
 vm.runInContext(markup, context);
 const q = {id:'q', type:'mcq', source:'source', page:2, question:'Fixture', options:['A','B'], letters:['A','B'], answer:0,
  figures:[{image:'/question.png', caption:'Question figure'}],
  reviewFigures:[{image:'/review.png', caption:'Explanation figure'}]};
 assert.match(context.originalQuestionMarkup(q,0), /question\.png/);
 assert.doesNotMatch(context.originalQuestionMarkup(q,0), /review\.png|#page=/);
 originalRun.finishedAt = '2026-11-26';
 assert.match(context.originalQuestionMarkup(q,0), /review\.png/);
 assert.match(context.originalQuestionMarkup(q,0), /Instructor’s answer/);
});
