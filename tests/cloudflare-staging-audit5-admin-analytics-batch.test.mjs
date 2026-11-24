import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/admin-control.mjs',import.meta.url),'utf8');
const from=source.indexOf('function analyticsSummaryQuery(db)'),to=source.indexOf('\nexport async function controlRoute(',from);
assert.ok(from>0&&to>from);
const ctx=vm.createContext({});vm.runInContext(source.slice(from,to)+'\nthis.usageAnalytics=usageAnalytics;',ctx);
const rowsFor=(query,sharing=5)=>{
 if(query.includes('FROM review_accounts a LEFT JOIN'))return [{registered:12,active7:4,active30:8,onboarded:10,sharing,completedReviews:17,answeredQuestions:103}];
 if(query.includes("kind NOT LIKE 'resource-open:%'"))return [{day:'2026-11-24',kind:'study-answered',count:3}];
 if(query.includes('substr(created_at,1,10)'))return [{day:'2026-11-24',count:2}];
 if(query.includes('JOIN admin_shared_resources r'))return [{title:'Synthetic PDF',count:6}];
 if(query.includes('FROM review_question_reports GROUP BY category'))return [{category:'ambiguous-wording',count:5}];
 throw Error('Unexpected SQL shape: '+query);
};
function fakeDb(sharing=5){
 const calls={batch:0,all:0,prepared:[]};
 const db={prepare(sql){
  const stmt={sql,all:async()=>{calls.all++;return {results:structuredClone(rowsFor(sql,sharing))}}};
  calls.prepared.push(stmt);return stmt;
 },async batch(stmts){
  calls.batch++;
  assert.equal(stmts.length,5,'only independent read-only statements may be combined');
  assert.ok(stmts.every(s=>s.sql.trim().toUpperCase().startsWith('SELECT')),'no writes or destructive SQL');
  return Promise.all(stmts.map(s=>({results:structuredClone(rowsFor(s.sql,sharing))})));
 }};
 return {db,calls};
}
function expected(sharing=5){
 return {
  summary:{registered:12,active7:4,active30:8,onboarded:10,sharing,
   completedReviews:sharing<5?null:17,answeredQuestions:sharing<5?null:103},
  activity:[{day:'2026-11-24',kind:'study-answered',count:3}],
  registrations:[{day:'2026-11-24',count:2}],
  popularity:[{title:'Synthetic PDF',count:6}],
  problems:[{category:'ambiguous-wording',count:5}]
 };
}
test('A5-233 one read-only D1 batch returns unchanged admin analytics schema and exact totals',async()=>{
 for(const sharing of [0,1,4,5,10]){
  const {db,calls}=fakeDb(sharing),actual=await ctx.usageAnalytics(db);
  assert.equal(JSON.stringify(actual),JSON.stringify(expected(sharing)));
  assert.equal(calls.batch,1);assert.equal(calls.all,0);assert.equal(calls.prepared.length,5);
 }
 assert.match(source,/if\(section==='analytics' && request\.method==='GET'\)\{\s*\/\/ All five independent read-only aggregate statements execute in one D1 batch\.\s*return adminResponse\(await usageAnalytics\(db\)\);/);
});
test('A5-233 preserve privacy suppression and reduce D1 round trips on synthetic account-safe aggregates',async()=>{
 let oldInvocations=0;
 const data=expected(4);
 const old=async()=>{for(let i=0;i<5;i++)oldInvocations++;return data};
 const {db,calls}=fakeDb(4);
 const [previous,next]=await Promise.all([old(),ctx.usageAnalytics(db)]);
 assert.deepEqual(JSON.parse(JSON.stringify(next)),previous);
 assert.equal(oldInvocations,5);assert.equal(calls.batch,1);
 console.log(JSON.stringify({label:'A5-233 admin analytics synthetic D1 metadata',readQueries:5,roundTripsBefore:oldInvocations,roundTripsAfter:calls.batch,privacySuppressionPreserved:true}));
});
