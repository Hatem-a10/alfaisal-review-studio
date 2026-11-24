import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const current=readFileSync(new URL('../public/phase2-question-quality.mjs',import.meta.url),'utf8');
const oldParsed="const stemText=text(q.question),options=array(q.options).map(normalize),choices=JSON.stringify([...options].sort());";
const newParsed="const stemText=text(q.question),options=normalizedOptions(q.options),choices=JSON.stringify([...options].sort());";
const oldMaps="let prev=new Map();for(let j=0;j<=Math.min(m,limit);j++)prev.set(j,j);";
const newMaps="let prev=new Map(),curr=new Map();for(let j=0;j<=Math.min(m,limit);j++)prev.set(j,j);";
const oldLoop="const curr=new Map(),lo=Math.max(0,i-limit),hi=Math.min(m,i+limit);";
const newLoop="curr.clear();const lo=Math.max(0,i-limit),hi=Math.min(m,i+limit);";
const oldEnd="if(![...curr.values()].some(v=>v<=limit))return false;prev=curr;";
const newEnd="if(![...curr.values()].some(v=>v<=limit))return false;const old=prev;prev=curr;curr=old;";
assert.ok(current.includes(newParsed)&&current.includes(newMaps)&&current.includes(newLoop)&&current.includes(newEnd));
let baseline=current.replace(/const optionCache=new WeakMap\(\);[\s\S]*?(?=const array=)/,'').replace(newParsed,oldParsed).replace(newMaps,oldMaps).replace(newLoop,oldLoop).replace(newEnd,oldEnd);
function fixture(code){
 let maps=0,normalizations=0;
 class CountingMap extends Map{constructor(...args){super(...args);maps++}}
 const ctx=vm.createContext({Map:CountingMap,Set,WeakMap,JSON,Math,Object,Array,String,Number});
 const instrumented=code.replace("const normalize=value=>text(value).normalize", "const normalize=value=>(globalThis.normalizations++,text(value)).normalize").replaceAll('export function ','function ');
 ctx.normalizations=0;
 vm.runInContext(instrumented+'\nthis.api={duplicateKey,nearDuplicate,deduplicateQuestions,closeSequence}',ctx);
 return {api:ctx.api,counts:()=>({maps,normalized:ctx.normalizations})};
}
const q=(id,question='Which vessel carries oxygenated blood toward the cardiac tissue?',options=['Aorta','Pulmonary artery','Pulmonary vein','Vena cava'])=>({id,question,options,answer:0,lectureIds:['CVP-P1']});
test('A5-267 unchanged options, sparse arrays, and in-place edits preserve all matching behavior',()=>{
 const before=fixture(baseline).api,after=fixture(current).api;
 const rows=[q('a'),q('b'),q('c','Which vessel transports oxygenated blood into the heart muscle?'),q('d','No correct option is shown',['Aorta','Cava','Vein','Vein'])];
 rows.push({...q('e'),image:'x.png'});
 for(const x of rows){assert.equal(after.duplicateKey(x),before.duplicateKey(x));for(const y of rows)assert.equal(after.nearDuplicate(x,y),before.nearDuplicate(x,y))}
 assert.deepEqual(Array.from(after.deduplicateQuestions(rows),x=>x.id),Array.from(before.deduplicateQuestions(rows),x=>x.id));
 rows[0].options[0]='Different';assert.equal(after.duplicateKey(rows[0]),before.duplicateKey(rows[0]));
 rows[0].options.push('Extra');assert.equal(after.duplicateKey(rows[0]),before.duplicateKey(rows[0]));
 delete rows[0].options[2];assert.equal(after.duplicateKey(rows[0]),before.duplicateKey(rows[0]));
 rows[0].options[2]=undefined;assert.equal(after.duplicateKey(rows[0]),before.duplicateKey(rows[0]));
 rows[0].options=['Replaced','Other'];assert.equal(after.duplicateKey(rows[0]),before.duplicateKey(rows[0]));
});
test('A5-267 repeatedly parsed unchanged question options avoid full normalization work',()=>{
 const a=fixture(baseline),b=fixture(current),x=q('same');
 for(let i=0;i<500;i++){assert.equal(a.api.duplicateKey(x),b.api.duplicateKey(x))}
 const prior=a.counts(),next=b.counts();
 assert.ok(next.normalized<prior.normalized/10,JSON.stringify({prior,next}));
 console.log(JSON.stringify({label:'A5-267 unchanged question option normalization',calls:500,baseline:prior.normalized,candidate:next.normalized}));
});
test('A5-224 scratch map reuse preserves exact bounded edit-distance semantics',()=>{
 const a=fixture(baseline),b=fixture(current);
 const words=Array.from({length:100},(_,i)=>'word'+i),close=words.slice();close[50]='different';const far=words.slice().reverse();
 for(const sample of [words,close,far,words.slice(1),[...words,'extra']])assert.equal(b.api.closeSequence(words,sample),a.api.closeSequence(words,sample));
 const old=a.counts().maps,now=b.counts().maps;
 assert.ok(now<old/3,JSON.stringify({before:old,after:now}));
 console.log(JSON.stringify({label:'A5-224 synchronous fuzzy comparison scratch allocation',baselineMapAllocs:old,candidateMapAllocs:now,words:100}));
});
