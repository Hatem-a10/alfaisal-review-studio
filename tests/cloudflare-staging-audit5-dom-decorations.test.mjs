import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
const oldPanels='dialog:not(#xpCalculator),.et-practice-tabs,.learning-area-tabs,#otherToolsTabs';
const newPanels='dialog:not(#xpCalculator):not(.phase3-modal),.et-practice-tabs:not(.phase3-tabs),.learning-area-tabs:not(.phase3-tabs),#otherToolsTabs:not(.phase3-tabs)';
const oldDone='.answer-feedback.correct,.topic-completed';
const newDone='.answer-feedback.correct:not(.phase3-completion),.topic-completed:not(.phase3-completion)';
function nodes(){
 const create=(tag,id='',classes=[])=>({tagName:tag,id,classes:new Set(classes),calls:0,add(v){this.calls++;this.classes.add(v)}});
 return [create('DIALOG','settings'),create('DIALOG','xpCalculator'),create('DIV','', ['et-practice-tabs']),create('DIV','otherToolsTabs'),create('DIV','',['answer-feedback','correct']),create('DIV','',['topic-completed']),create('DIV','',['learning-area-tabs'])];
}
function matches(el,selector){
 return selector.split(',').some(part=>{
  const p=part.split(':not(')[0];
  const eligible=p==='dialog'?el.tagName==='DIALOG':p[0]==='#'?el.id===p.slice(1):p[0]==='.'?p.split('.').filter(Boolean).every(c=>el.classes.has(c)):false;
  if(!eligible)return false;
  return [...part.matchAll(/:not\(([^)]+)\)/g)].every(m=>m[1][0]==='#'?el.id!==m[1].slice(1):!el.classes.has(m[1].slice(1)));
 });
}
function decorate(nodes,optimized){
 const p=optimized?newPanels:oldPanels,q=optimized?newDone:oldDone;
 for(const el of nodes.filter(el=>matches(el,p)))el.add(el.tagName==='DIALOG'?'phase3-modal':'phase3-tabs');
 for(const el of nodes.filter(el=>matches(el,q)))el.add('phase3-completion');
}
test('A5-215 final modal, tab and completion classes exactly match baseline across repeat renders',()=>{
 const before=nodes(),after=nodes();
 for(let pass=0;pass<30;pass++){decorate(before,false);decorate(after,true);
  assert.deepEqual(after.map(x=>[x.id,[...x.classes].sort()]),before.map(x=>[x.id,[...x.classes].sort()]));
 }
 assert.ok(before.reduce((n,x)=>n+x.calls,0)>after.reduce((n,x)=>n+x.calls,0));
 assert.equal(after.find(x=>x.id==='xpCalculator').classes.has('phase3-modal'),false);
});
test('A5-215 only new DOM nodes are decorated after repeated renders',()=>{
 const after=nodes();decorate(after,true);
 const calls=after.reduce((n,x)=>n+x.calls,0);
 for(let i=0;i<120;i++)decorate(after,true);
 assert.equal(after.reduce((n,x)=>n+x.calls,0),calls);
 const inserted={tagName:'DIV',id:'',classes:new Set(['topic-completed']),calls:0,add(v){this.calls++;this.classes.add(v)}};
 after.push(inserted);decorate(after,true);assert.equal(inserted.calls,1);assert.ok(inserted.classes.has('phase3-completion'));
 console.log(JSON.stringify({label:'A5-215 repeat lesson navigation DOM decoration',repeatRenders:120,initialDecorations:calls,extraRedundantAddCalls:0}));
});
test('A5-215 optimized live selectors stay tied to the existing delegated renderer',()=>{
 assert.ok(source.includes(newPanels));assert.ok(source.includes(newDone));
 assert.ok(!source.includes(oldPanels));assert.ok(!source.includes(oldDone));
 assert.match(source,/\.forEach\(el=>el\.classList\.add\(el\.tagName==='DIALOG'\?'phase3-modal':'phase3-tabs'\)\)/);
});
