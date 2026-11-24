import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGroupText,formatGroupRows,validateGroupRows,mountAcademicAdmin} from '../public/phase1-academic-admin.mjs';
import {validateGroups} from '../lib/academic-config.mjs';
const groups=[{studentGroup:'M1',studentSection:'A',labGroups:['1.6','1.5']}];
test('group editor round trips verified rows and rejects ambiguous separators and empty labs',()=>{
 assert.deepEqual(parseGroupText('M1,A:1.6, 1.5'),groups);
 assert.equal(formatGroupRows(groups),'M1,A:1.6,1.5');
 for(const value of ['M1,A:1.6:1.7','M1,A,B:1.6','M1,A:1.6,,1.7','M1,A:','M1,A:1.6\nM1,A:1.7','M1,A:1.6,1.6'])assert.throws(()=>parseGroupText(value));
});
test('server and UI agree on the supported group and section domain',()=>{
 for(const value of [groups,[{...groups[0],studentGroup:'M9'}],[{...groups[0],studentSection:'C'}],[{...groups[0],labGroups:['bad:lab']}]])assert.equal(validateGroupRows(value),validateGroups(value));
 assert.equal(validateGroups(groups),true);assert.equal(validateGroups([{...groups[0],studentGroup:'M9'}]),false);
 assert.throws(()=>formatGroupRows([{...groups[0],labGroups:'1.6'}]),/Invalid group response/);
});
test('requests serialize, and late response does not overwrite the edited draft',async()=>{
 const nodes={textarea:{value:'M1,A:1.6'},'[role=status]':{},'[data-load]':{},'[data-save]':{}};
 const host={querySelector:()=>null,append(){}},section={dataset:{},querySelector:k=>nodes[k]};
 const priorDoc=globalThis.document,priorFetch=globalThis.fetch;
 let calls=0,release;
 try{
  globalThis.document={getElementById:()=>host,createElement:()=>section};
  globalThis.fetch=()=>{calls++;return new Promise(r=>release=r)};
  mountAcademicAdmin();
  const pending=nodes['[data-save]'].onclick();assert.equal(nodes['[data-load]'].disabled,true);
  await nodes['[data-load]'].onclick();assert.equal(calls,1);
  nodes.textarea.value='M1,A:1.7';release({ok:true,json:async()=>({groups})});await pending;
  assert.equal(nodes.textarea.value,'M1,A:1.7');assert.match(nodes['[role=status]'].textContent,/newer edits remain unsaved/);
  assert.equal(nodes['[data-save]'].disabled,false);
 }finally{globalThis.document=priorDoc;globalThis.fetch=priorFetch}
});
