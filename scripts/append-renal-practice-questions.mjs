// Input and output contain private academic material. Keep both outside Git.
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const [packFile, intakeFile, imageDir, outputDir] = process.argv.slice(2);
assert(outputDir, 'Usage: node scripts/append-renal-practice-questions.mjs <base pack> <intake> <image directory> <new private output directory>');
const setId = 'ren-19-anzhelika-practice';
const packPath = 'materials/ren123/interactive-assessments.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const pack = read(packFile);
assert.equal(pack.version, 1);
const batches = read(intakeFile);
assert(Array.isArray(batches) && batches.length);
const imageFiles = readdirSync(imageDir);
const assets = new Map();
const existing = new Map(pack.questions.map(question => [question.id, question]));
let set = pack.sets.find(row => row.id === setId);
if (!set) {
 set = {id: setId, title: 'Anzhelika’s Practice Questions', category: 'other', batch: 19, course: 'REN',
  ids: [], note: 'REN 123 practice questions with the answer keys and explanations supplied by the instructor.'};
 pack.sets.push(set);
}

mkdirSync(outputDir, {mode: 0o700});
for (const {id, label, rows} of batches) {
 assert(Number.isSafeInteger(id) && id > 0 && typeof label === 'string' && rows.length);
 const source = 'ren-19-anzhelika-' + id;
 if (!pack.sources.some(row => row.id === source)) {
  pack.sources.push({id: source, title: 'Anzhelika’s Practice Questions · ' + label,
   url: 'https://elearning.alfaisal.edu/mod/url/view.php?id=' + id, linkLabel: 'Moodle practice set', web: true});
 }
 rows.forEach(({question, options, acceptedAnswers, explanation, images}, index) => {
  const page = index + 1;
  assert((question?.trim() || images.some(image => image.region === 'question')) && options.length >= 2 && options.length <= 8 && options.every(option => option?.trim()), 'Incomplete question ' + source + ':' + page);
  assert(acceptedAnswers.length === 1 && Number.isInteger(acceptedAnswers[0]) && acceptedAnswers[0] >= 0 && acceptedAnswers[0] < options.length,
   'One source-verified answer required for ' + source + ':' + page);
  const letters = options.map((_, position) => String.fromCharCode(65 + position));
  const figures = [], reviewFigures = [];
  for (const [number, {url, alt, region}] of images.entries()) {
   assert(region === 'question' || region === 'explanation', 'Review option visuals before importing');
   const ref = new URL(url);
   assert(ref.origin === 'https://my.qbankmanager.com' && ref.pathname.startsWith('/media/') && !ref.search && !ref.hash);
   const name = imageFiles.find(file => file.split('.')[0] === hash(url));
   assert(name && /\.(png|jpg|webp)$/.test(name), 'Missing visual ' + source + ':' + page);
   const bytes = readFileSync(join(imageDir, name));
   const sha = hash(bytes);
   const extension = name.split('.').at(-1);
   assert(extension === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex'))
    : extension === 'jpg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff','hex'))
    : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP', 'Unexpected visual format');
   const path = 'materials/ren123/assessments/anzhelika/' + sha + '.' + extension;
   const file = join(outputDir, sha + '.' + extension);
   if (!assets.has(path)) copyFileSync(join(imageDir, name), file);
   assets.set(path, {path, size: bytes.length, sha, file});
   (region === 'question' ? figures : reviewFigures).push({image: '/api/site-assets/' + path, page,
    caption: region === 'question' ? 'Question figure' : 'Explanation figure', alt: alt || '', number: number + 1, sha});
  }
  const answer = acceptedAnswers[0];
  const fingerprint = hash(JSON.stringify([question, [...options].sort(), figures.map(figure => figure.sha)]));
  const questionId = source + '-' + fingerprint.slice(0, 16);
  const previous = existing.get(questionId);
  if (previous) {
   assert.equal(previous.options[previous.answer], options[answer], 'Source answer changed for ' + questionId);
   return;
  }
  const row = {id: questionId, source, page, endPage: page, question: question?.trim() || 'Refer to the question figure.', type: 'mcq', options, letters,
   printedAnswer: letters[answer] + '. ' + options[answer], answer, figures, reviewFigures, sourceExplanation: explanation};
  pack.questions.push(row);
  existing.set(questionId, row);
  set.ids.push(questionId);
 });
}
const file = join(outputDir, 'interactive-assessments.json');
const json = JSON.stringify(pack);
writeFileSync(file, json);
assets.set(packPath, {path: packPath, size: Buffer.byteLength(json), sha: hash(json), file});
writeFileSync(join(outputDir, 'upload.json'), JSON.stringify([...assets.values()], null, 2));
console.log(set.ids.length + ' questions in the combined set. ' + (assets.size - 1) + ' distinct visuals in this import.');
