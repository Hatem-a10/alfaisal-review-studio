import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8');
const from=s.indexOf('const ankiPlainFaceCache='),to=s.indexOf('function ankiSafeHtml(',from);
assert.ok(from>=0&&to>from,'sanitizer cache is defined before regular sanitizer');
function fixture(){
 let deck={media:{}},passes=0;
 const context=vm.createContext({ankiDeck:deck,WeakMap,Object,ankiSafeHtml:(html,media)=>{passes++;return html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/onerror="[^"]*"/g,'')}});
 vm.runInContext(s.slice(from,to)+'\nthis.safe=ankiSanitizedFace',context);
 return {safe:(card,back,html)=>context.safe(card,back,html,{}),setMedia:media=>{context.ankiDeck={media}},passes:()=>passes};
}
test('A5-175 exact text-only front/back sanitizer output and invalidation after in-place edits',()=>{
 const f=fixture(),card={id:'q1'},raw='<p>First</p><script>unsafe</script>';
 const a=f.safe(card,false,raw),b=f.safe(card,false,raw),back=f.safe(card,true,'<div>Answer</div>'),sameBack=f.safe(card,true,'<div>Answer</div>');
 assert.equal(a,b);assert.equal(back,sameBack);assert.equal(f.passes(),2);
 assert.equal(a,'<p>First</p>');assert.equal(back,'<div>Answer</div>');
 const changed=f.safe(card,false,'<p>Edited</p>');assert.equal(changed,'<p>Edited</p>');assert.equal(f.passes(),3);
 f.safe({id:'q1'},false,raw);assert.equal(f.passes(),4,'new card object invalidates cache');
});
test('A5-175 mixed-media decks retain per-paint sanitization, preventing stale media reuse',()=>{
 const f=fixture(),card={id:'q1'},raw='<img src="file.png">';
 f.setMedia({'file.png':new Blob(['x'])});
 f.safe(card,false,raw);f.safe(card,false,raw);assert.equal(f.passes(),2);
 f.setMedia({});f.safe(card,false,raw);assert.equal(f.passes(),3);
});
test('A5-175 repeated front/back text-only redraws avoid repeated DOM parser work',()=>{
 const f=fixture(),card={id:'redraw'},html='<section><p>Medical term</p><p>Definition</p></section>';
 for(let i=0;i<300;i++){f.safe(card,false,html);f.safe(card,true,html)}
 assert.equal(f.passes(),2);
 assert.match(s,/html=ankiSanitizedFace\(card,back,html,media\)/);
 console.log(JSON.stringify({label:'A5-175 sanitized text-only Anki card',redraws:600,baselineSanitizeCalls:600,candidateSanitizeCalls:2}));
});
