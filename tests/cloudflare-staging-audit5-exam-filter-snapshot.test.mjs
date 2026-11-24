import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/examplify-mode.js',import.meta.url),'utf8');
const originalNav=" function nav(){return exam().questions.map((q,i)=>{const isAnswered=answered(i),flag=!!exam().flags[i];if(filter==='flagged'&&!flag||filter==='unanswered'&&isAnswered||filter==='answered'&&!isAnswered)return '';return `<button type=\"button\" data-xp-jump=\"${i}\" class=\"${isAnswered?'xp-answered':''} ${i===data().current?'xp-current':''}\" aria-current=\"${i===data().current?'step':'false'}\" aria-label=\"Question ${i+1}, ${isAnswered?'answered':'unanswered'}${flag?', flagged':''}\">${i+1}${flag?'<span class=\"xp-flag-marker\" aria-hidden=\"true\">⚑</span>':''}</button>`}).join('')||'<small>No questions match.</small>'}\n";
const baselineAnswered=" function answered(i){const e=exam(),v=e.answers[i],q=e.questions[i];return !!q&&(Number.isInteger(v)&&v>=0&&v<q.options.length||!q.options.length&&typeof v==='string'&&v.trim().length>0)}\n";
const currentNav=source.slice(source.indexOf(' function nav(){'),source.indexOf(' function question(){'));
function fixture(code,run,filter='all',position=0){
 const count={exam:0,data:0};
 const context=vm.createContext({Number,filter,exam:()=>{count.exam++;return run},data:()=>{count.data++;return {current:position}}});
 vm.runInContext(baselineAnswered+code+'\nthis.draw=nav',context);
 return {html:()=>context.draw(),counts:count};
}
const run=(n=50)=>{
 const questions=Array.from({length:n},(_,i)=>({id:'q'+i,options:i%7?['A','B','C','D']:[]}));
 const answers=Object.fromEntries(questions.map((q,i)=>[i,q.options.length?(i%3===0?2:i%4===0?-1:undefined):(i%3===0?'typed answer':'')]));
 const flags=Object.fromEntries(questions.map((_,i)=>[i,i%6===0]));
 return {questions,answers,flags};
};
test('A5-153 exam navigation HTML is identical across filters, answer types, flags and current index',()=>{
 const instance=run();
 for(const filter of ['all','answered','unanswered','flagged'])for(const position of [0,2,49]){
  const before=fixture(originalNav,instance,filter,position),after=fixture(currentNav,instance,filter,position);
  assert.equal(after.html(),before.html(),JSON.stringify({filter,position}));
 }
 instance.answers[1]=3;instance.flags[4]=true;
 assert.equal(fixture(currentNav,instance,'flagged',4).html(),fixture(originalNav,instance,'flagged',4).html());
 instance.questions[2]=null;
 assert.equal(fixture(currentNav,instance,'all',2).html(),fixture(originalNav,instance,'all',2).html());
});
test('A5-153 per-render run and current-position lookups drop from per-question to once',()=>{
 const data=run(5000),before=fixture(originalNav,data,'answered',4999),after=fixture(currentNav,data,'answered',4999);
 assert.equal(after.html(),before.html());
 assert.ok(before.counts.exam>=5001);
 assert.equal(after.counts.exam,1);
 assert.ok(before.counts.data>1000);assert.equal(after.counts.data,1);
 console.log(JSON.stringify({label:'A5-153 exam filter navigation snapshot',questions:5000,examLookupsBefore:before.counts.exam,examLookupsAfter:after.counts.exam,currentLookupsBefore:before.counts.data,currentLookupsAfter:after.counts.data}));
});
test('A5-153 only caches data within one paint so mutations remain visible on next paint',()=>{
 const data=run(200),before=fixture(originalNav,data,'unanswered',3),after=fixture(currentNav,data,'unanswered',3);
 assert.equal(after.html(),before.html());
 data.answers[2]=2;data.flags[2]=true;
 assert.equal(after.html(),before.html());
 assert.match(source,/function nav\(\)\{const run=exam\(\),position=data\(\)\.current/);
});
