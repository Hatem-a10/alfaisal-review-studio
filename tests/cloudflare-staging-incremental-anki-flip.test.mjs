import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8');
test('Anki flip updates only card frame and ratings without full workspace render',()=>{
 const code=src.slice(src.indexOf('function ankiRevealCurrent(){'),src.indexOf('async function ankiSrcdoc(',src.indexOf('function ankiRevealCurrent(){')));
 let painting=0,replaces=0,rendering=0;
 const c={id:'7'},ratingsButton={replaceWith(){replaces++}};
 const context={ankiDeck:{id:'d'},ankiBack:false,ankiAdvancing:false,ankiQueue:[c],ankiIndex:0,ankiProgress:()=>({}),ankiSchedule:()=>({interval:1}),AnkiEngine:{rate:()=>({interval:3})},ankiPaint:()=>painting++,render:()=>rendering++,'$':()=>ratingsButton,document:{createElement(tag){return {tag,dataset:{},append(){},set className(v){},set type(v){},set textContent(v){}}}}};
 runInNewContext(code+';ankiRevealCurrent()',context);
 assert.equal(context.ankiBack,true);assert.equal(painting,1);assert.equal(replaces,1);assert.equal(rendering,0);
});
test('media previews reuse bounded account-scoped file reads but not large files',async()=>{
 const code=src.slice(src.indexOf('const ankiMediaTextCache='),src.indexOf('function ankiRevealCurrent(){'));
 let reads=0,account='a';
 class Reader{readAsDataURL(f){reads++;this.result='data:'+f.size;this.onload()}}
 const context={Map,FileReader:Reader,ankiAccount:()=>account};const api=runInNewContext(code+';ankiMediaData',context);
 const small={size:100},large={size:2000000};assert.equal(await api(small),'data:100');assert.equal(await api(small),'data:100');assert.equal(reads,1);
 await api(large);await api(large);assert.equal(reads,3);
 account='b';await api(small);assert.equal(reads,4);
});
