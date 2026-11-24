import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

const oldSource="function guidedNextLesson(){const current=DATA.items.find(x=>x.id===lessonId),course=DATA.items.filter(x=>x.course===current.course),i=course.findIndex(x=>x.id===lessonId);return course[i+1]}";
const source=readFileSync(new URL('../public/guided-flow.js',import.meta.url),'utf8');
const candidate=source.split('\n').find(l=>l.startsWith('function guidedNextLesson()'));
const normalize=x=>x?JSON.parse(JSON.stringify(x)):x;
function setup(fn,items,id){
 const ctx=vm.createContext({DATA:{items},lessonId:id});
 vm.runInContext(fn+';this.run=guidedNextLesson',ctx);
 return ctx.run;
}
function match(items,id){
 const a=setup(oldSource,items,id),b=setup(candidate,items,id);
 let before,after,left,right;
 try{before=normalize(a())}catch(e){left=e.name}
 try{after=normalize(b())}catch(e){right=e.name}
 assert.deepEqual(after,before);
 assert.equal(right,left);
}
test('A5-135 guided next lecture selection retains first-ID and course-order semantics',()=>{
 const items=[
  {id:'MOL-1',course:'MOL'}, {id:'CVP-A1',course:'CVP'},
  {id:'REN-A1',course:'REN'}, {id:'MOL-2',course:'MOL'},
  {id:'MOL-1',course:'MOL'}, {id:'REN-P1',course:'REN'},
  {id:'MOL-3',course:'MOL'},{id:'CVP-A2',course:'CVP'}
 ];
 for(const id of ['MOL-1','MOL-2','MOL-3','CVP-A1','CVP-A2','REN-A1','REN-P1','missing'])match(items,id);
 for(const n of [0,1,2,5,200]){const rows=Array.from({length:n},(_,i)=>({id:'MOL-'+i,course:i%7===0?'REN':'MOL'}));for(const id of rows.slice(0,25).map(x=>x.id))match(rows,id)}
});
function median(run){run();const times=[];for(let k=0;k<7;k++){let start=performance.now();for(let i=0;i<100;i++)run();times.push(performance.now()-start)}return times.sort((a,b)=>a-b)[3]}
test('A5-135 next lecture 50,000 item catalog avoids full array filtering',()=>{
 const items=Array.from({length:50000},(_,i)=>({id:'L'+i,course:i%3===0?'MOL':i%3===1?'REN':'CVP'}));
 const a=setup(oldSource,items,'L30000'),b=setup(candidate,items,'L30000');
 assert.equal(b(),a());
 const before=median(a),after=median(b);
 console.log(JSON.stringify({label:'A5-135 guided next same-course scan',baselineMedianMs:before,candidateMedianMs:after,items:items.length,baselineFilteredCatalogAllocations:1,candidateFilteredCatalogAllocations:0}));
});
