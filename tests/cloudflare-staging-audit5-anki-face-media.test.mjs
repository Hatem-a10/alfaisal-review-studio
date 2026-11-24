import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const baseline="async function ankiSrcdoc(card,back){for(const url of ankiUrls)URL.revokeObjectURL(url);ankiUrls=[];const used=JSON.stringify(card.fields)+card.css+card.template.qfmt+card.template.afmt,media=Object.fromEntries(await Promise.all(Object.entries(ankiDeck.media).filter(([k])=>used.includes(k)||used.includes(encodeURI(k))).map(async([k,b])=>[k,await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read deck media'));reader.readAsDataURL(b)})])));const raw=(card.stock===6||/image-occlusion:/.test(card.fieldValues?.[0]||''))?ankiIo(card,back):AnkiEngine.template(card,back);let html=raw.replace(/\\[sound:([^\\]]+)\\]/g,(_,name)=>media[name]?'<audio controls preload=\"metadata\" src=\"'+media[name]+'\"></audio>':'<small>Missing audio: '+esc(name)+'</small>');html=ankiSafeHtml(html,media);let css=String(card.css||'').replace(/<\\/style/gi,'').replace(/@import[^;]+;/gi,'').replace(/url\\([\"']?([^)'\"\\s]+)[\"']?\\)/gi,(_,name)=>media[name]?'url(\"'+media[name]+'\")':'none');const nonce=[...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join(''),dark=settings.theme==='amoled',mathUrl=new URL('/vendor/mathjax-tex-svg.js',location.href).href;return '<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src \\'none\\'; img-src blob: data:; media-src blob: data:; font-src blob: data:; style-src \\'unsafe-inline\\'; script-src '+mathUrl+' \\'nonce-'+nonce+'\\'; connect-src \\'none\\'; form-action \\'none\\';\"><style>body{margin:24px;font:20px/1.6 system-ui;background:'+(ankiBg?'transparent':dark?'#090b0c':'#fff')+';color:'+(dark?'#eef2f3':'#16262d')+'}img,svg{max-width:100%;height:auto}audio{max-width:100%}.cloze{color:#3295e8;font-weight:bold}.card{text-align:center}input{font:inherit;padding:8px;max-width:90%}'+css+(ankiBg?'body.card{background-color:transparent!important;text-shadow:0 1px 2px '+(dark?'#000':'#fff')+';}':'')+'</style></head><body class=\"card '+(dark?'nightMode night_mode':'')+'\">'+(back&&ankiTyped?'<p><small>Your typed answer:</small> '+esc(ankiTyped)+'</p>':'')+html+'<script nonce=\"'+nonce+'\">document.addEventListener(\"input\",function(e){if(e.target.tagName===\"INPUT\")parent.postMessage({kind:\"anki-typed\",value:e.target.value},\"*\")});document.addEventListener(\"keydown\",function(e){if(e.target.closest(\"input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]\")||e.target.isContentEditable)return;if(e.code===\"Space\"||[\"1\",\"2\",\"3\",\"4\"].includes(e.key)){e.preventDefault();parent.postMessage({kind:\"anki-key\",key:e.key,code:e.code},\"*\")}})</script><script src=\"'+mathUrl+'\"></script></body></html>'}";
const candidate=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('async function ankiSrcdoc('));
function fixture(source,back=false,occlusion=false){
 const reads=[],revoked=[],urls=[];
 class FakeURL extends URL{static revokeObjectURL(url){revoked.push(url)}}
 class Reader{readAsDataURL(blob){reads.push(blob);this.result='data:image/png;base64,'+blob;this.onload?.()}}
 const card={stock:occlusion?6:0,fields:{front:'[front.png]',back:'[back.png]',hidden:'[unused.jpg]'},fieldValues:occlusion?['{{c1::image-occlusion:rect:front.png}}']:[],css:'body{background:url(shared.png)}',template:{qfmt:'<img src="front.png">',afmt:'<img src="back.png">'}};
 const media={'front.png':'FRONT','back.png':'BACK','unused.jpg':'UNUSED','shared.png':'SHARED','auxiliary image.png':'AUX'};
 const ctx=vm.createContext({card,ankiUrls:urls,ankiDeck:{media},ankiTyped:'',ankiBg:null,settings:{theme:'light'},location:{href:'https://example.test/practice'},URL:FakeURL,FileReader:Reader,esc:String,crypto:{getRandomValues:x=>{x.fill(3);return x}},ankiSafeHtml:(html,dict)=>html.replace(/src="([^"]+)"/g,(_,name)=>'src="'+(dict[name]||name)+'"'),ankiIo:()=>'<img src="front.png">',AnkiEngine:{template:(card,back)=>back?card.template.afmt:card.template.qfmt}});
 vm.runInContext(source+'\nthis.renderCard=ankiSrcdoc',ctx);
 return {run:()=>ctx.renderCard(card,back),reads,revoked};
}
test('A5-176 Anki visible card face contains exactly the same sanitized markup',async()=>{
 for(const back of [false,true])for(const occlusion of [false,true]){
  const old=fixture(baseline,back,occlusion),current=fixture(candidate,back,occlusion);
  assert.equal(await current.run(),await old.run());
  assert.deepEqual(current.revoked,old.revoked);
  assert.deepEqual(current.reads,occlusion?['FRONT','SHARED']:back?['BACK','SHARED']:['FRONT','SHARED']);
  assert.deepEqual(old.reads,['FRONT','BACK','SHARED']);
 }
});
test('A5-176 avoid decoding media only mentioned by inactive template or hidden fields',async()=>{
 const old=fixture(baseline),next=fixture(candidate);
 await old.run();await next.run();
 assert.equal(old.reads.length,3);
 assert.equal(next.reads.length,2);
 console.log(JSON.stringify({label:'A5-176 Anki media decoding',baselineMediaReads:old.reads.length,candidateMediaReads:next.reads.length,visibleFace:'front',cssReferences:1}));
});
