import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('A5-087 classic mock timer work is separate from question-list markup',()=>{
 const s=file('public/exam-tools.js'),tick=s.split('\n').find(x=>x.startsWith('function etTick()'));
 assert.match(tick,/if\(document.hidden\)return/);
 assert.match(tick,/etReconcileExam\(\)/);
 assert.match(tick,/const seconds=.*?countdown/);
 assert.doesNotMatch(tick,/etQuestionMarkup\(|etMockPanel\(/);
});
test('A5-192 reusable Anki IndexedDB connection closes upon version change',()=>{
 const s=file('public/anki.js'),db=s.split('\n').find(x=>x.startsWith('function ankiDB()'));
 assert.match(s,/let ankiDBPromise=null/);
 assert.match(db,/ankiDBPromise\?\?=/);
 assert.match(db,/onversionchange=\(\)=>\{r.result.close\(\);ankiDBPromise=null\}/);
 assert.match(db,/catch\(e=>\{ankiDBPromise=null;throw e\}\)/);
});
test('A5-193 device rehydration is bootstrap/account-switch, not per render',()=>{
 const s=file('public/device-storage.js');
 assert.equal((s.match(/await hydrate\(/g)||[]).length,2);
 assert.match(s,/if\(db\)await hydrate\(!!verifiedAccount\)/);
 assert.match(s,/await hydrate\(\);location.reload\(\)/);
});
test('A5-208 noneligible ephemeral requests are excluded from SW caching',async()=>{
 const {cacheKind}=await import('../public/phase3-cache-policy.mjs');
 for(const route of ['/api/progress','/api/capabilities','/api/decks','/api/account-key','/api/admin-auth','/auth/sign-in'])assert.equal(cacheKind(route),null,route);
 assert.equal(cacheKind('/api/lesson-data'),'core');
 assert.equal(cacheKind('/api/private-media/abc'),'private');
});
test('A5-225 closing search releases per-view result/index caches',()=>{
 const s=file('public/phase1-search.mjs'),close=s.split('\n').find(x=>x.includes("dialog.addEventListener('close'"));
 assert.match(close,/index=\[\];results=\[\];memoIndex=null;memoResults=null/);
 assert.match(close,/paintedResults=null;paintedSelected=-1;list.replaceChildren\(\)/);
 assert.match(close,/request\+\+/);
});
test('A5-229 question activity maps do not outlive the calculation',()=>{
 const s=file('public/activity-metrics.mjs');
 const before=s.slice(s.indexOf('export function questionHistory('),s.indexOf('export function historyDates('));
 assert.match(before,/const days=new Map\(\),aliases=new Map\(\),attempts=attemptsOf\(practice\),dateKeys=new Map\(\)/);
 assert.match(before,/const resolved=new Map\(\)/);
 assert.match(before,/return history;/);
 assert.doesNotMatch(before,/globalThis\.|window\.|localStorage|sessionStorage/);
});
test('A5-242 authenticated progress request body parses once before validation',()=>{
 const s=file('app/api/progress/route.ts');
 const put=s.slice(s.indexOf('export async function PUT('),s.indexOf('\nfunction validPointer('));
 const patch=s.slice(s.indexOf('export async function PATCH('));
 for(const body of [put,patch]){
  assert.match(body,/await readBounded\(request,12000000\)/);
  assert.equal((body.match(/JSON\.parse\(raw\)/g)||[]).length,1);
 }
});
test('A5-248 deck query relies on D1 ordering with no redundant JS sort',()=>{
 const s=file('app/api/decks/route.ts'),get=s.slice(s.indexOf('export async function GET('),s.indexOf('export async function POST('));
 assert.match(get,/ORDER BY created_at DESC/);
 assert.match(get,/decks:rows.results.map\(/);
 assert.doesNotMatch(get,/\.sort\(/);
});
test('A5-275 runtime startup sources come from public, not tests directory',()=>{
 const s=file('scripts/client-scripts.mjs');
 assert.match(s,/path.resolve\(root,'public',name\)/);
 assert.match(s,/if\(!file.startsWith\(path.join\(root,'public'\)\+path.sep\)\)throw Error/);
 assert.doesNotMatch(s,/path.resolve\(root,'tests'/);
});
test('A5-290 synthetic benchmark suites assert equivalence before timing',()=>{
 for(const path of ['tests/cloudflare-staging-audit5-booklet-selection.test.mjs','tests/cloudflare-staging-audit5-original-source-lookup.test.mjs','tests/cloudflare-staging-audit5-library-projection.test.mjs']){
  const s=file(path);
  assert.match(s,/assert\.deepEqual\(/);
  assert.match(s,/baselineMedianMs|baselineMedian|median\(/);
 }
});
