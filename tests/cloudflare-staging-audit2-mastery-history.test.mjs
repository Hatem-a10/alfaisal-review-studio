import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const inline=read('inline-topics.js'),exam=read('exam-tools.js');
const get=(src,name)=>{const line=src.split('\n').find(l=>l.startsWith('function '+name+'('));assert.ok(line);return line};
test('completion requires 85% of available core questions, not attempted answers',()=>{
 const qs=Array.from({length:5},(_,i)=>({id:'q'+i,answer:0}));
 const score=runInNewContext(get(inline,'inlineTopicScore')+'\ninlineTopicScore',{inlineLatest:()=>new Map()});
 const rec=n=>({learning:{results:Object.fromEntries(qs.slice(0,n).map(q=>[q.id,{ok:true}]))}});
 assert.equal(score({id:'MOL-1'},qs,rec(1)).complete,false);
 assert.equal(score({id:'MOL-1'},qs,rec(4)).complete,false);
 assert.equal(score({id:'MOL-1'},qs,rec(5)).complete,true);
 assert.equal(score({id:'MOL-1'},qs.concat({id:'variant',duplicateOf:'q0'}),rec(5)).complete,true);
 assert.equal(score({id:'MOL-1'},[],rec(5)).complete,false);
 assert.equal(score({id:'CVP-P2'},qs,rec(3)).complete,true);
});
test('low-score mock snapshots survive saving and summaries do not enter performance',()=>{
 const stored=new Map(),etExam={id:'low',finishedAt:'2026-11-24T00:00:00Z',excludedLowScore:true};
 const h={etExam,etHistory:[{id:'low',correct:0,total:5}],etExamKey:'mock',etHistoryKey:'history',localStorage:{setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},toast:()=>{throw Error('unexpected failure')}};
 runInNewContext(get(exam,'etSaveExam')+'\netSaveExam()',h);
 assert.equal(JSON.parse(stored.get('mock')).id,'low');
 assert.equal(JSON.parse(stored.get('history'))[0].correct,0);
 assert.match(exam,/if\(etExam.excludedLowScore\)etExam.logged=0;etHistory=/);
 assert.match(read('study-workflows.js'),/h.filter\(e=>.*slice\(-100\)/);
 assert.match(read('study-vault.js'),/k==='history'.*slice\(-100\)/);
});
test('draft failure produces explicit feedback and retry',()=>{
 const s={topic:{id:'t'},questions:[{id:'q'}],orders:[[0]],answers:{0:0},graded:{}};
 const status={dataset:{topic:'t'},classList:{toggle(){}}};let warning='';
 const fn=runInNewContext(get(inline,'inlineDraftStatus')+'\n'+get(inline,'inlineSaveDraft')+'\ninlineSaveDraft',{document:{querySelector:()=>status},inlineReadDrafts:()=>({}),inlineDraftKey:'drafts',localStorage:{setItem(){throw Error('disk full')}},toast:m=>warning=m,window:{}});
 fn({id:'MOL-1'},s);
 assert.match(status.textContent,/not confirmed saved/);
 assert.match(warning,/saving failed/);
 assert.match(inline,/id="retryInlineDraft"/);
});
