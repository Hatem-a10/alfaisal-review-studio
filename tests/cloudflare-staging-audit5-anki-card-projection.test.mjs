import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {matchDecks as candidate} from '../public/phase3-crosslinks.mjs';
const baseline="export const normalize=value=>typeof value==='string'?value.normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim():'';\nconst array=v=>Array.isArray(v)?v:[];\nconst identifier=v=>typeof v==='string'&&v.length>0;\nconst courses={cvp:'112',mol:'114',ren:'123'};\nfunction cardLabels(deck,card){return [deck.name,card.deck,...(Array.isArray(card.tags)?card.tags:[card.tags])].map(normalize).filter(Boolean)}\nfunction explicitlyScoped(text){return new Set([...text.matchAll(/(?:^| )(cvp|mol|ren)(?= |$)/g)].map(m=>m[1]))}\nexport function matchDecks(lectures,decks){\n const result=new Map(),seenDecks=new Set(),validLectures=array(lectures).flatMap(lecture=>{\n  if(!identifier(lecture?.id))return [];\n  const code=lecture.id.match(/^(CVP|MOL|REN)-([AP]?)(\\d+)$/);if(!code)return [];\n  const name=normalize(lecture.title),course=code[1].toLowerCase(),letter=code[2].toLowerCase(),number=code[3];\n  return [{lecture,name,course,letter,explicit:new RegExp('(?:^| )'+course+' (?:'+courses[course]+' )?'+letter+' ?'+number+'(?: |$)'),local:new RegExp('(?:^| )'+letter+' ?'+number+'(?: |$)')}];\n });\n for(const deck of array(decks)){\n  if(!identifier(deck?.id)||seenDecks.has(deck.id)||!Array.isArray(deck.cards))continue;\n  seenDecks.add(deck.id);\n  const cardText=deck.cards.filter(card=>identifier(card?.id)&&!(Number(card.schedule?.queue)<0)).map(card=>({id:card.id,labels:cardLabels(deck,card)}));\n  for(const {lecture,name,course,letter,explicit,local} of validLectures){\n   const ids=[...new Set(cardText.filter(card=>{\n    const {labels}=card;if(labels.some(text=>explicit.test(text)))return true;\n    const scoped=card.scoped??=new Set(labels.flatMap(text=>[...explicitlyScoped(text)]));\n    if(scoped.size&&(!scoped.has(course)||scoped.size>1))return false;\n    if(letter&&scoped.has(course)&&labels.some(text=>local.test(text)))return true;\n    return name.length>=10&&labels.some(text=>(' '+text+' ').includes(' '+name+' '));\n   }).map(c=>c.id))];\n   if(ids.length){const list=result.get(lecture.id)||[];if(!list.some(row=>row.deckId===deck.id))list.push({deckId:deck.id,cardIds:ids,count:ids.length,name:deck.name});result.set(lecture.id,list)}\n  }\n }\n return result;\n}\n";
const original=vm.runInNewContext(baseline.replace(/\bexport\s+/g,'')+'\nmatchDecks');
const norm=map=>JSON.parse(JSON.stringify([...map]));
const median=fn=>{fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]};
function fixture(n=300){
 const lectures=[{id:'MOL-1',title:'Molecular Genetics Basics'},{id:'MOL-2',title:'Cell Structure'},{id:'REN-A5',title:'Renal Histology'},{id:'CVP-P10',title:'Heart Valve Mechanics'}];
 const decks=Array.from({length:7},(_,k)=>({id:'deck-'+k,name:['MOL 114','REN A5','CVP P10','Misc'][k%4],cards:Array.from({length:n},(_,i)=>({id:'card-'+i,deck:i%2?'MOL 1':'MOL 2',tags:i%13===0?['REN A5','CVP P10']:i%3===0?['MOL','MOL 114']:'other',schedule:{queue:i%19===0?-1:0}}))}));
 decks[0].cards.push({deck:'MOL 1',tags:'MOL 114'});decks[0].cards.push({id:'',deck:'REN A5'});decks.push({...decks[0],cards:[{id:'dup',deck:'REN A5'}]});decks.push({id:'invalid',name:'x',cards:null});
 return {lectures,decks};
}
test('A5-172 one-pass per-deck card grouping retains exact matching and deck precedence',()=>{
 for(const n of [0,1,100,800]){const {lectures,decks}=fixture(n);for(const order of [decks,decks.slice().reverse()]){
  assert.deepEqual(norm(candidate(lectures,order)),norm(original(lectures,order)));
 }}
 const blank={lectures:[null,{id:'bad'},{id:'REN-A5',title:'Renal histology'}],decks:[null,{}, {id:'valid',name:'REN A5',cards:[null,{id:'ok',deck:'REN A5',tags:[]},{id:'empty',deck:'x',schedule:{queue:-2}}]}]};
 assert.deepEqual(norm(candidate(blank.lectures,blank.decks)),norm(original(blank.lectures,blank.decks)));
});
test('A5-172 avoid intermediate filtered card list in large multi-deck matching',()=>{
 const {lectures,decks}=fixture(9000),a=()=>original(lectures,decks),b=()=>candidate(lectures,decks);
 assert.deepEqual(norm(b()),norm(a()));
 const baselineMedianMs=median(a),candidateMedianMs=median(b);
 console.log(JSON.stringify({label:'A5-172 Anki card projection per deck',baselineMedianMs,candidateMedianMs,decks:decks.length,cards:decks.reduce((n,d)=>n+(d.cards?.length||0),0),intermediateFilteredArraysBefore:7,intermediateFilteredArraysAfter:0}));
});
