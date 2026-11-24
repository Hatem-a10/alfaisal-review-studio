import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const path = fileURLToPath(new URL('../docs/audits/', import.meta.url));
const read = name => readFileSync(path + name, 'utf8');
const index = read('AUDIT-4-INDEX.md');
const rows = index.split('\n').filter(line => /^\| A4-\d{3} \|/.test(line));
const recent = [
 [102,9,'audit-4-vault-integrity.md','VI'],
 [103,6,'audit-4-active-daily-queue.md','DQ'],
 [105,12,'audit-4-material-alias.md','MA'],
 [106,6,'audit-4-academic-admin-controls.md','AG'],
 [107,8,'audit-4-lecture-changelog-ui.md','CL'],
 [108,19,'audit-4-ospe-integrity.md','OS'],
 [109,7,'audit-4-schedule-layout.md','SL'],
 [110,14,'audit-4-repair-visual.md','RV'],
 [111,13,'audit-4-answer-reconciliation.md','AR'],
 [112,3,'audit-4-renal-histology.md','RH'],
];
const columns = line => line.split('|').slice(1,-1).map(s => s.trim());

test('the audit-4 register contains exactly 500 distinct contiguous canonical issue IDs', () => {
 assert.equal(rows.length, 500);
 const unique = new Set();
 for (let i = 0; i < rows.length; i++) {
  const [id, origin, issue, remedy, verification] = columns(rows[i]);
  assert.equal(id, 'A4-' + String(i + 1).padStart(3, '0'));
  assert.ok(!unique.has(id), 'Repeated issue '+id);
  unique.add(id);
  assert.match(origin, /https:\/\/github\.com\/Hatem-a10\/alfaisal-review-studio\/pull\/\d+\)/);
  assert.ok(issue && remedy, id + ' must include evidence and a remedy');
  assert.match(verification, /Merged; candidate CI passed/);
 }
 assert.match(index, /Current register: 500 source-level findings and hardening cases; 0 remain/);
 assert.match(index, /not a claim of 500 production incidents/);
});

test('each of the final 97 issues exists once in its corresponding original batch ledger', () => {
 const last = rows.slice(403);
 assert.equal(last.length, 97);
 assert.equal(recent.reduce((sum, b) => sum + b[1], 0), 97);
 let offset = 0;
 for (const [pr, count, ledger, prefix] of recent) {
  const actual = read(ledger).split('\n').filter(line => new RegExp('^\\| '+prefix+'-\\d+ \\|').test(line));
  assert.equal(actual.length, count, ledger + ' unique source entries');
  const ids = new Set();
  for (const row of last.slice(offset, offset+count)) {
   const [id, origin, issue, remedy] = columns(row);
   assert.match(origin, new RegExp('pull/'+pr+'\\) / '+prefix+'-\\d+$'));
   const localId = origin.split(' / ').at(-1);
   assert.ok(!ids.has(localId), localId + ' repeated in index');
   ids.add(localId);
   const ledgerLine = actual.find(line => columns(line)[0] === localId);
   assert.ok(ledgerLine, id+' source ledger row not found');
   const [_, recordedIssue, recordedRemedy] = columns(ledgerLine);
   assert.equal(issue, recordedIssue, id + ' issue differs from evidence ledger');
   assert.equal(remedy, recordedRemedy, id + ' remedy differs from evidence ledger');
  }
  const receipt = index.split('\n').filter(line => line.startsWith('| [#'+pr+']('));
  assert.equal(receipt.length, 1, 'One CI receipt per PR '+pr);
  assert.match(receipt[0], new RegExp('\\| '+count+' \\|'));
  assert.ok(receipt[0].includes('[Details]('+ledger+')'), 'Ledger link for PR '+pr);
  assert.match(receipt[0], new RegExp('/actions/runs/\\d+'));
  assert.match(receipt[0], /[a-f0-9]{40}/);
  offset += count;
 }
 assert.equal(offset, 97);
});

test('published verification notes preserve the boundary between code review and real deployment', () => {
 assert.match(index, /No CVP lecture-content edits, production release, migrations, live-data changes, or destructive cleanup/);
 assert.match(index, /real authenticated Safari production sign-in remains unverified/);
 assert.match(index, /No production verification\/deployment has been performed/);
});
