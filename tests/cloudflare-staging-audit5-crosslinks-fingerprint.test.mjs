import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLectureChangeDetector} from '../public/phase3-lecture-change.mjs';

const source=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
function oldDetector(){let previous='';return rows=>{const next=JSON.stringify(rows.map(item=>[item?.id,item?.title]));if(next===previous)return false;previous=next;return true}}
test('A5-230 exact lecture change decisions for ordinary titles, IDs, and in-place edits',()=>{
 const old=oldDetector(),next=createLectureChangeDetector();
 let records=[{id:'REN-P1',title:'Glomerular filtration'},{id:'MOL-P1',title:'Enzymes'},{id:'CVP-P1',title:'Archive'}];
 const check=()=>assert.equal(next(records),old(records),JSON.stringify(records));
 check();check();records[1].title='Enzyme kinetics';check();check();
 records.splice(1,0,{id:'REN-P2',title:'Renal physiology'});check();
 records.reverse();check();records=records.map(x=>({...x}));check();
 records[0].id='REN-C3';check();records.pop();check();
 records=[{id:null,title:undefined},{id:'REN-P1',title:'A'}];check();
 records[0].title=null;check();
});
test('A5-230 fallback retains legacy JSON behavior for unusual, mutable field types',()=>{
 const old=oldDetector(),next=createLectureChangeDetector(),title={label:'A'},rows=[{id:'REN-P1',title}];
 const check=()=>assert.equal(next(rows),old(rows));
 check();check();title.label='B';check();check();
 rows[0].title=Number.POSITIVE_INFINITY;check();
 rows[0].title=NaN;check();
 rows[0].title='Stable';check();check();
});
test('A5-230 unchanged 5000-lecture navigation performs zero full JSON serializations',()=>{
 const rows=Array.from({length:5000},(_,i)=>({id:'REN-P'+i,title:'Synthetic lecture '+i}));
 const changed=createLectureChangeDetector();assert.equal(changed(rows),true);
 let encodes=0;const stringify=JSON.stringify;
 try{JSON.stringify=function(...args){encodes++;return stringify.apply(this,args)};
  for(let i=0;i<150;i++)assert.equal(changed(rows),false);
 }finally{JSON.stringify=stringify}
 assert.equal(encodes,0);
 assert.match(source,/const lectureCatalogChanged=createLectureChangeDetector\(\)/);
 assert.doesNotMatch(source,/JSON\.stringify\(items\.map\(x=>\[x\?\.id,x\?\.title\]\)\)/);
 console.log(JSON.stringify({label:'A5-230 long navigation catalog fingerprint',lectures:5000,repeats:150,fullCatalogJSONStringAllocationsBefore:150,after:0}));
});
