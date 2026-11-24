import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {hasAnkiCollection} from '../lib/personal-upload.ts';
const require=createRequire(import.meta.url),mod={exports:{}};
new Function('module','exports','require','__dirname',readFileSync(new URL('../public/vendor/jszip.min.js',import.meta.url),'utf8'))(mod,mod.exports,require,'public/vendor');
const JSZip=mod.exports;
async function zipFile(entries){const zip=new JSZip();for(const [name,bytes] of entries)zip.file(name,bytes);return new File([await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})],'test.apkg')}
test('cloud archive preflight accepts actual supported collection directory and local entry',async()=>{
 for(const name of ['collection.anki2','collection.anki21','collection.anki21b'])assert.equal(await hasAnkiCollection(await zipFile([[name,new Uint8Array([1,2,3])],['media','{}']])),true);
});
test('cloud archive preflight rejects truncated headers, irrelevant ZIP, and corrupted directory',async()=>{
 assert.equal(await hasAnkiCollection(new File([new Uint8Array([80,75,3,4,1])],'fake.apkg')),false);
 assert.equal(await hasAnkiCollection(await zipFile([['notes.txt','Not a collection']])),false);
 const good=await zipFile([['collection.anki2','fixture']]),bytes=new Uint8Array(await good.arrayBuffer());
 assert.equal(await hasAnkiCollection(new File([bytes.slice(0,-1)],'truncated.apkg')),false);
 bytes[0]=0;assert.equal(await hasAnkiCollection(new File([bytes],'bad.apkg')),false);
});
test('image-only Anki conditionals render their contents and absent prototype names remain empty',()=>{
 const E=runInNewContext(readFileSync(new URL('../public/anki-engine.js',import.meta.url),'utf8')+'\nAnkiEngine',{TextDecoder});
 const card={fields:{Image:'<img src="diagram.png">'},deck:'Test',model:'Basic',template:{name:'Basic',qfmt:'{{#Image}}{{Image}}{{/Image}}{{constructor}}',afmt:'{{Image}}'}};
 const html=E.template(card,false);assert.match(html,/<img/);assert.doesNotMatch(html,/function Object|native code/);
});
test('attachment upload preserves actual presentation order and accounts for omitted figures',()=>{
 const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
 assert.match(read('upload-review.js'),/ppt\/_rels\/presentation\.xml\.rels/);
 assert.match(read('upload-review.js'),/getElementsByTagNameNS\('\*','sldId'\)/);
 assert.match(read('upload-review.js'),/omittedFigures\+\+/);
 assert.match(read('learning.js'),/form.set\('attachKnown','1'\)/);
 assert.match(read('upload-review.js'),/form.set\('attachKnown','1'\)/);
 assert.match(read('learning.js'),/finally\{await pdf.destroy\(\)\}/);
});
test('download and refresh operations retain the account that initiated them',()=>{
 const source=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8');
 assert.match(source,/run!==ankiLoadGeneration\|\|ankiAccount\(\)!==account/);
 assert.match(source,/ankiCheckAccount\(account\);await importAnki\(file,meta,account\)/);
 assert.match(source,/ankiDBPromise=null;throw e/);
 assert.match(source,/reported cards/);
});
