import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const c=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../public/answer-integrity.js',import.meta.url),'utf8')+';this.engine=AnswerIntegrity',c);const {reconcile}=c.engine;
const run=answers=>({startedAt:'2026-10-29T00:00:00Z',answers});
test('stale background save does not overwrite a newer answer from another tab',()=>{const base=run({q:4}),stale=run({q:4}),newer={...run({q:1}),answerVersions:{q:100}};let x=reconcile(stale,base,newer,200);assert.equal(x.answers.q,1)});
test('an explicit change after a remote change wins and persists by question',()=>{const base=run({q:4}),local=run({q:1}),remote={...run({q:4,other:2}),answerVersions:{other:100}};let x=reconcile(local,base,remote,200);assert.equal(x.answers.q,1);assert.equal(x.answers.other,2);assert.equal(x.answerVersions.q,200)});
test('clearing a response propagates and later stale saves cannot restore it',()=>{const base=run({q:4}),local=run({}),out=reconcile(local,base,run({q:4}),200);assert.equal(out.answers.q,undefined);const stale=reconcile(run({q:4}),base,out,300);assert.equal(stale.answers.q,undefined)});
test('separate retry attempts never merge choices',()=>{const a={startedAt:'2026-10-29T01:00:00Z',answers:{q:1}},b=run({q:4});assert.equal(reconcile(a,null,b,200).answers.q,1)});
