import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/admin-control.mjs',import.meta.url),'utf8');
const from=source.indexOf('function analyticsSummaryQuery(db)'),to=source.indexOf('\nexport async function controlRoute(',from);
assert.ok(from>0&&to>from);
const context=vm.createContext({});
vm.runInContext(source.slice(from,to)+'\nthis.api={overviewSummary,usageAnalytics};',context);
function makeDb(sharing=8){
 const calls={batch:0,all:0,sql:[]};
 const rows=sql=>{
  if(sql.includes('FROM review_accounts a LEFT JOIN'))return [{registered:27,active7:12,active30:24,onboarded:19,sharing,completedReviews:125,answeredQuestions:543}];
  if(sql.includes("kind NOT LIKE 'resource-open:%'"))return [{day:'2026-11-24',kind:'login',count:17}];
  if(sql.includes('substr(created_at,1,10)'))return [{day:'2026-11-24',count:3}];
  if(sql.includes('JOIN admin_shared_resources'))return [{title:'Synthetic',count:7}];
  if(sql.includes('FROM review_question_reports GROUP BY'))return [{category:'missing-source',count:2}];
  throw Error('Unexpected SQL: '+sql);
 };
 const db={
  prepare(sql){calls.sql.push(sql);return {sql,all:async()=>{calls.all++;return {results:structuredClone(rows(sql))}}}},
  async batch(stmts){calls.batch++;return Promise.all(stmts.map(s=>({results:structuredClone(rows(s.sql))})))}
 };
 return {db,calls};
}
test('A5-251 lightweight owner overview only reads aggregate count, not optional analytics tables',async()=>{
 const x=makeDb(9),summary=await context.api.overviewSummary(x.db);
 assert.equal(summary.registered,27);
 assert.equal(summary.active7,12);
 assert.equal(summary.answeredQuestions,543);
 assert.equal(x.calls.all,1);
 assert.equal(x.calls.batch,0);
 assert.equal(x.calls.sql.length,1);
 assert.match(x.calls.sql[0],/FROM review_accounts a LEFT JOIN control_students/);
 assert.doesNotMatch(x.calls.sql[0],/review_question_reports|admin_shared_resources/);
 assert.match(source,/const summary=role==='owner'\?await overviewSummary\(db\):undefined/);
 console.log(JSON.stringify({label:'A5-251 owner overview D1 request budget',queriesBefore:5,queriesAfter:1,optionalBreakdownsLoaded:false}));
});
test('A5-251 overview and detailed analytics have identical privacy-filtered summary fields',async()=>{
 for(const sharing of [0,2,4,5,17]){
  const a=makeDb(sharing),b=makeDb(sharing);
  const overview=await context.api.overviewSummary(a.db),all=await context.api.usageAnalytics(b.db);
  assert.deepEqual(JSON.parse(JSON.stringify(overview)),JSON.parse(JSON.stringify(all.summary)));
  assert.equal(overview.completedReviews,sharing<5?null:125);
  assert.equal(overview.answeredQuestions,sharing<5?null:543);
  assert.equal(a.calls.all,1);assert.equal(b.calls.batch,1);
 }
});
test('A5-251 non-owner overview preserves original no-summary behavior without database aggregation',()=>{
 const overviewRoute=source.slice(source.indexOf("if(section==='overview'"),source.indexOf("if(section==='students'"));
 assert.match(overviewRoute,/role==='owner'\?await overviewSummary\(db\):undefined/);
 assert.doesNotMatch(overviewRoute,/usageAnalytics\(db\)/);
});
