import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/learning-ui.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/learning-ui.css',import.meta.url),'utf8');
const start=source.indexOf('function lessonPrintMarkup(');
const end=source.indexOf("document.addEventListener('click',event=>",start);
assert.ok(start>=0&&end>start);
const esc=value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const conceptsStart=source.indexOf('function objectiveConcepts('),conceptsEnd=source.indexOf('function transcriptReviewMarkup(',conceptsStart);
assert.ok(conceptsStart>=0&&conceptsEnd>conceptsStart);
const markup=runInNewContext(source.slice(conceptsStart,conceptsEnd)+source.slice(start,end)+'\nlessonPrintMarkup',{
 guideFigure:(figure,title)=>'<figure>'+esc(title)+'</figure>',
 esc,guideParagraphs:v=>v?(Array.isArray(v)?v:[v]).map(s=>'<p>'+esc(s)+'</p>').join(''):'',
 guideList:v=>v?.length?'<ul>'+v.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'',
 sourceById:id=>id==='s'?{name:'Lecture slides',unit:'slide'}:null,
});
test('study sheet contains every topic and educational section but no student state or quiz answer keys',()=>{
 const guide={overview:'Overview text',objectives:['Objective'],sections:[
  {title:'First',body:['Teaching'],keyPoints:['Remember'],pitfalls:['Trap'],example:{solution:'Worked'},references:[{source:'s',page:3}],questions:[{answer:'secret'}]},
  {title:'Second <unsafe>',paragraphs:['Second body'],concepts:[{title:'Filtration concept',text:'Concept text'}]}
 ],sourceNotes:['Caution'],summary:['Recap'],notes:'private'};
 const html=markup({id:'REN-A1',title:'Renal',notes:'private'},guide);
 for(const value of ['REN-A1','Renal','Overview text','Objective','First','Remember','Trap','Worked','Lecture slides · slide 3','Second &lt;unsafe&gt;','Second body','Caution','Recap','Filtration concept','Concept text'])assert.ok(html.includes(value),value);
 assert.doesNotMatch(html,/private|secret|<button|<input|<unsafe>/);
});
test('print mode is opt-in and isolates the guide from the rest of the app',()=>{
 assert.match(source,/data-print-lesson/);
 assert.match(source,/window\.print\(\)/);
 assert.match(source,/afterprint/);
 assert.match(css,/#lessonPrintSheet\{display:none\}/);
 assert.match(css,/@media print/);
 assert.match(css,/body\.printing-lesson-sheet>\*:not\(#lessonPrintSheet\)\{display:none!important\}/);
});
