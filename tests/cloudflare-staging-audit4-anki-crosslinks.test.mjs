import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {matchDecks} from '../public/phase3-crosslinks.mjs';
import {createLectureChangeDetector} from '../public/phase3-lecture-change.mjs';
const lectures=[{id:'MOL-14',title:'Introduction to Metabolism'},{id:'REN-A1',title:'Posterior abdominal wall'},{id:'CVP-A1',title:'Posterior abdominal wall'}];
test('crosslinks tolerate malformed data and duplicate deck or lecture identities',()=>{
 const d={id:'d',name:'MOL 114 14',cards:[null,{id:'a'},{id:'a'},{id:'s',schedule:{queue:-1}},{id:3}]};
 const result=matchDecks([null,{id:4},...lectures,lectures[0]],[null,{id:'bad',cards:{}},d,d]);
 assert.deepEqual(result.get('MOL-14').map(x=>x.cardIds),[['a']]);
 assert.equal(matchDecks(null,{}).size,0);
});
test('wrong course numbers and unrelated adjacent fields cannot synthesize a lecture code',()=>{
 const decks=[{id:'bad',name:'MOL 123 14',cards:[{id:'a'}]},{id:'split',name:'MOL',cards:[{id:'a',deck:'14'}]},{id:'ok',name:'MOL 114 14',cards:[{id:'a'}]}];
 assert.deepEqual(matchDecks(lectures,decks).get('MOL-14').map(d=>d.deckId),['ok']);
});
test('course-scoped titles do not leak another course with the same title',()=>{
 const decks=[{id:'ren',name:'REN 123 A1 Posterior abdominal wall',cards:[{id:'a'}]},{id:'ambiguous',name:'MOL REN Posterior abdominal wall',cards:[{id:'b'}]}];
 const links=matchDecks(lectures,decks);
 assert.equal(links.has('CVP-A1'),false);assert.deepEqual(links.get('REN-A1').map(d=>d.deckId),['ren']);
});
test('whole-title boundaries avoid substring matches in unrelated card tags',()=>{
 const result=matchDecks(lectures,[{id:'bad',name:'Reintroduction to metabolism',cards:[{id:'a'}]},{id:'ok',name:'Introduction to Metabolism revision',cards:[{id:'a'}]}]);
 assert.deepEqual(result.get('MOL-14').map(d=>d.deckId),['ok']);
});
test('runtime invalidates cached lecture matching when curriculum changes and hides inaccessible links',()=>{
 const source=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
 const start=source.indexOf('let deckIdentity,'),end=source.indexOf('const questionBefore=',start);
 const ctx={DATA:{items:[lectures[0]]},ankiDecks:[{id:'d',name:'REN 123 A1',cards:[{id:'a'}]}],matchDecks,createLectureChangeDetector,lessonById:id=>lectures.find(l=>l.id===id),window:{reviewStudyItemVisible:item=>item.id!=='CVP-A1'}};
 const api=runInNewContext(source.slice(start,end)+'\n({matches,actions,visibleLecture})',ctx);
 assert.equal(api.matches().has('REN-A1'),false);
 ctx.DATA.items.push(lectures[1]);assert.equal(api.matches().has('REN-A1'),true);
 assert.equal(api.visibleLecture('CVP-A1'),false);assert.equal(api.actions(['CVP-A1']),'');
 ctx.ankiDecks=undefined;assert.equal(api.matches().size,0);
 assert.match(source,/if\(!visibleLecture\(button\.dataset\.p3Cards\)\)return/);
});
