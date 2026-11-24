import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {indexChangelog} from '../scripts/lecture-changelog-index.mjs';
// Frozen pre-change query expressions from lecture-changelog.mjs.
const oldSources=(learning,ids)=>(learning.sources||[]).filter(s=>ids.has(s.id)).sort((a,b)=>a.id.localeCompare(b.id));
const oldQuestions=(learning,id,digest)=>Object.fromEntries(learning.questions.filter(q=>q.lectureIds?.includes(id)).map(q=>[q.id,digest(q)]).sort(([a],[b])=>a.localeCompare(b)));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16);
function median(fn){fn();const times=[];for(let i=0;i<5;i++){const start=performance.now();fn();times.push(performance.now()-start)}return times.sort((a,b)=>a-b)[2]}
test('A5-076 and A5-077 preserve exact source ordering and question hash overwrite behavior',()=>{
 const learning={sources:[{id:'é',name:'first'},{id:'é',name:'second'},{id:'x',name:'first x'},{id:'x',name:'second x'}],questions:[{id:'same',lectureIds:['A','A','B'],question:'old'},{id:'same',lectureIds:'A,C',question:'new'},{id:'q',lectureIds:['B']},{id:'none'}]};
 const next=indexChangelog(learning,digest);
 for(const ids of [new Set(['x','é','é']),new Set(['missing']),new Set()])assert.deepEqual(next.sources(ids),oldSources(learning,ids));
 for(const id of ['A','B','C','missing'])assert.deepEqual(next.questions(id),oldQuestions(learning,id,digest));
});
test('A5-076/A5-077 lecture changelog synthetic association workload',()=>{
 const lessons=Array.from({length:200},(_,i)=>'L'+i),learning={sources:Array.from({length:1600},(_,i)=>({id:'s'+i,name:'source '+i})),questions:Array.from({length:10000},(_,i)=>({id:'q'+i,lectureIds:[lessons[i%200],lessons[(i+23)%200]],question:'Question '+i}))};
 const sourceSets=lessons.map((_,i)=>new Set(['s'+i,'s'+(i+200),'s'+(i+400)]));
 let oldHashes=0,newHashes=0;
 const oldDigest=q=>{oldHashes++;return digest(q)},nextDigest=q=>{newHashes++;return digest(q)};
 const before=()=>lessons.map((id,i)=>[oldSources(learning,sourceSets[i]),oldQuestions(learning,id,oldDigest)]);
 const after=()=>{const index=indexChangelog(learning,nextDigest);return lessons.map((id,i)=>[index.sources(sourceSets[i]),index.questions(id)])};
 assert.deepEqual(after(),before());assert.equal(oldHashes,20000);assert.equal(newHashes,10000);
 console.log(JSON.stringify({label:'A5-076/A5-077 combined changelog indexing',baselineMedianMs:median(before),candidateMedianMs:median(after),baselineQuestionDigestCalls:20000,candidateQuestionDigestCalls:10000,lessons:200,questions:10000,sources:1600}));
});
