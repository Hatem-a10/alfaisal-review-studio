import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/learning-ui.js',import.meta.url),'utf8');
const paragraphStart=source.indexOf('const staticGuideParagraphs='),paragraphEnd=source.indexOf('function guideList(',paragraphStart);
const currentParagraph=source.slice(paragraphStart,paragraphEnd);
const oldParagraph="function guideParagraphs(value){return (Array.isArray(value)?value:value?[value]:[]).map(v=>\`<p>\${esc(typeof v==='string'?v:JSON.stringify(v))}</p>\`).join('')}".replaceAll('\\`','`').replaceAll('\\${','${');
function paras(code){let escaped=0;const ctx=vm.createContext({Array,JSON,WeakMap,esc:s=>{escaped++;return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')}});vm.runInContext(code+'\nthis.call=guideParagraphs',ctx);return {call:ctx.call,escaped:()=>escaped}}
test('A5-143 paragraph markup exactly matches original including mutation and object fallbacks',()=>{
 const a=paras(oldParagraph),b=paras(currentParagraph);
 for(const item of [null,undefined,'text',[],['A','B'],['<a>','&'],[{term:'x'}],['x',{term:'y'}],['',0,'z']]){
  assert.equal(b.call(item),a.call(item),String(item));
 }
 const values=['first','<second>','third'];
 assert.equal(b.call(values),a.call(values));values[1]='changed & now';assert.equal(b.call(values),a.call(values));
 values.push('added');assert.equal(b.call(values),a.call(values));
 assert.equal(b.call(['separate']),a.call(['separate']));
});
test('A5-143 repeated static guide render skips escaping and paragraph assembly',()=>{
 const a=paras(oldParagraph),b=paras(currentParagraph),arr=Array.from({length:80},(_,i)=>'Mechanism <'+i+'> & source');
 for(let i=0;i<200;i++)assert.equal(b.call(arr),a.call(arr));
 assert.ok(b.escaped()<=arr.length*2);
 assert.equal(a.escaped(),80*200);
 console.log(JSON.stringify({label:'A5-143 unchanged guide paragraphs',calls:200,sections:arr.length,escapedParagraphsBefore:a.escaped(),after:b.escaped()}));
});
const start=source.indexOf('lessonReader=function(x,l,s)'),end=source.indexOf('function practiceTopics(',start);
const current=source.slice(start,end);
const skip="// A5-021: the previous n/read scan was unused by this reader's output.\n const sections=guide.sections||[];guideTopic=";
const full="const sections=guide.sections||[],read=rec(x).learning?.read||[],n=sections.filter((v,i)=>read.includes('section:'+(v.id||x.id+'-section-'+i))).length;guideTopic=";
assert.ok(current.includes(skip));
const baseline=current.replace(skip,full);
function reader(code,mode='guide'){
 let reads=0,renderCalls=0;
 const guide={sections:Array.from({length:20},(_,i)=>({id:'P'+i,title:'Topic '+i})),overview:['One'],objectives:['Two'],summary:['Three'],references:[]};
 const ctx=vm.createContext({guideFor:()=>guide,customLesson:false,compactConceptReader:()=>'<old>',guideTopicLesson:null,guideTopic:0,deepMode:mode,cardIndex:0,read:[],
 rec:()=>{reads++;return {learning:{read:Array.from({length:1000},(_,i)=>'section:P'+i)}}},guideParagraphs:()=>'<p>Intro</p>',guideList:()=>'<ul></ul>',topicControls:()=>'<controls>',sectionCard:()=>{renderCalls++;return '<card>'},guideAtlas:()=>'<atlas>',topicConceptCard:()=>'<concept>',esc:String,lessonReader:()=>'<fallback>'});
 vm.runInContext(code+'\nthis.call=lessonReader',ctx);
 return {call:()=>ctx.call({id:'REN-P1'},null,{known:2}),reads:()=>reads,renderCalls:()=>renderCalls};
}
test('A5-021 removes unreachable section progress scan without changing lesson reader HTML',()=>{
 for(const mode of ['guide','cards']){const a=reader(baseline,mode),b=reader(current,mode);
  assert.equal(b.call(),a.call(),mode);assert.equal(b.renderCalls(),a.renderCalls());assert.equal(a.reads(),1);assert.equal(b.reads(),0);
 }
 console.log(JSON.stringify({label:'A5-021 unused lesson progress scan',readsPerRenderBefore:1,readsPerRenderAfter:0,sectionIncludesChecksBefore:20,after:0}));
});
