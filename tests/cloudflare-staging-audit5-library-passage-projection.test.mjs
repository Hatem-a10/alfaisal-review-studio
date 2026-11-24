import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const old="function searchPassages(){const terms=[...new Set(sourceSearch.toLowerCase().trim().split(/\\s+/).filter(Boolean))],all=LEARNING.sources.concat(uploads.map(u=>({...u,pages:uploadBodies[u.id]?.pages||[]}))),matches=[];if(!terms.length)return '';for(const s of all.filter(s=>libraryDocumentURL(s)&&librarySourceInCourse(s)))for(const p of s.pages||[]){if(typeof p.text!=='string')continue;const low=p.text.toLowerCase(),positions=terms.map(t=>low.indexOf(t));if(positions.every(i=>i>=0))matches.push({s,p,first:Math.min(...positions)})}return `<p class=\"muted\">${matches.length} matching extracted pages · showing ${Math.min(30,matches.length)}. Documents without extracted text remain available by title or original link.</p>${matches.slice(0,30).map(({s,p,first})=>{const i=Math.max(0,first-120),snippet=p.text.slice(i,i+650);return `<article class=\"search-passage\"><strong>${esc(s.name)} · ${s.unit==='slide'?'slide ':'PDF p'}${p.page}</strong><p>${i?'…':''}${esc(snippet)}${i+650<p.text.length?'…':''}</p><a href=\"${esc(libraryDocumentURL(s,p.page))}\" target=\"_blank\" rel=\"noopener noreferrer\">Open full document ↗</a></article>`}).join('')||'<div class=\"empty\">No extracted passages found. Try a shorter term or open the original material.</div>'}`}";
const lib="function libraryDocumentURL(source, page = 1, lookup) {\n if (!source) return null;\n const target = sourceTarget({source: source.id, page},lookup);\n if (!target || !/^(?:\\/api\\/(?:materials|study-assets)\\/[\\w-]+(?:[?#]|$)|\\/(?:api\\/site-assets\\/)?(?:materials|study_material)\\/|https:\\/\\/)/.test(target.url)) return null;\n if (!/\\.(?:pdf|pptx?|docx)(?:$|[?#])/i.test(target.url) && !/\\.(?:pdf|pptx?|docx)(?:$|[?#])/i.test(source.name)) return null;\n return sourcePageURL(target);\n}\n\nfunction librarySourceInCourse(source, scope=globalThis.reviewCourseScope, references) {\n  if(!scope)return !globalThis.reviewArchivedStudyItem?.(source);\n  if(source.course)return source.course===scope;\n  const ranges=Array.isArray(source.lectureRanges)?source.lectureRanges:[];\n  const mapped=[source.lectureId,...(source.lectureIds||[]),...ranges.map(range=>range.lectureId)].filter(Boolean);\n  if(mapped.length)return mapped.some(id=>id.startsWith(scope+'-'));\n  if(references ? references().has(source.id) : LEARNING.lessons.some(lesson=>lesson.id.startsWith(scope+'-')&&lesson.references?.some(ref=>ref.source===source.id)))return true;\n  return new RegExp('(?:^|[^a-z])'+scope+'(?:[^a-z]|$)','i').test(source.id+' '+source.name);\n}\n\nfunction libraryLookup(scope=globalThis.reviewCourseScope) {\n const sources=LEARNING.sources.concat(uploads),byId=new Map();let referenceIds;\n for(const source of sources)if(!byId.has(source.id))byId.set(source.id,source);\n return {scope,sources,lookup:id=>byId.get(id),references:()=>{if(!referenceIds){referenceIds=new Set();for(const lesson of LEARNING.lessons)if(lesson.id.startsWith(scope+'-'))for(const ref of lesson.references||[])referenceIds.add(ref.source)}return referenceIds}};\n}\n";
const candidate=readFileSync(new URL('../public/learning.js',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function searchPassages('));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fixture(src,scope='REN'){
 let idReads=0;
 const make=(id,props={})=>({get id(){idReads++;return id},name:'Material '+id+'.pdf',course:id.startsWith('REN')?'REN':'MOL',url:'/api/site-assets/materials/'+id+'.pdf',pages:[],...props});
 const sources=Array.from({length:1400},(_,i)=>make((i%3?'REN-':'MOL-')+i,i%179===0?{pages:Array.from({length:20},(_,j)=>({page:j+1,text:j%3===0?'Renal transport processes < mechanisms':'Glomerular filtration'}))}:{pages:[]}));
 sources.unshift(make('REN-duplicate',{pages:[{page:1,text:'Renal transport'}]}),make('REN-duplicate',{url:'/api/site-assets/materials/second-duplicate.pdf',pages:[]}));
 const uploads=Array.from({length:500},(_,i)=>make('REN-upload-'+i,{pages:undefined,course:'REN'}));
 const uploadBodies=Object.fromEntries(uploads.filter((_,i)=>i%107===0).map(u=>[u.id,{pages:[{page:2,text:'Renal transport from uploaded file'}]}]));
 const lessons=Array.from({length:40},(_,i)=>({id:'REN-A'+i,references:[{source:'REN-'+i}]}));
 const ctx=vm.createContext({LEARNING:{sources,lessons},uploads,uploadBodies,reviewCourseScope:scope,reviewArchivedStudyItem:()=>false,sourceSearch:'renal transport',esc:escapeHTML});
 const helpers=`const sourceById=id=>LEARNING.sources.find(s=>s.id===id)||uploads.find(s=>s.id===id);
 function sourceTarget(ref,lookup=sourceById){const s=lookup(ref.source);return s?{url:s.url,page:ref.page}:null}
 function sourcePageURL(target){return target.url+'#page='+target.page}`;
 vm.runInContext(helpers+'\n'+lib+'\n'+src+'\nthis.run=searchPassages;',ctx);
 return {run:()=>ctx.run(),setQuery:q=>ctx.sourceSearch=q,counts:()=>idReads,update:()=>{sources[2].pages=[{page:1,text:'Renal transport new'}]}};
}
const median=fn=>{fn();const samples=[];for(let i=0;i<7;i++){const t=performance.now();fn();samples.push(performance.now()-t)}return samples.sort((a,b)=>a-b)[3]};
test('A5-183/A5-189 searchable page projection preserves source scope, order, links and mutation',()=>{
 for(const scope of [undefined,'MOL','REN']){const a=fixture(old,scope),b=fixture(candidate,scope);
  for(const q of ['','renal transport','glomerular','missing term','transport','renal']){a.setQuery(q);b.setQuery(q);assert.equal(b.run(),a.run(),JSON.stringify({scope,q}))}
  a.update();b.update();a.setQuery('renal transport');b.setQuery('renal transport');assert.equal(b.run(),a.run());
 }
});
test('A5-183/A5-189 large catalog with sparse extracted pages avoids unneeded metadata checks',()=>{
 const a=fixture(old),b=fixture(candidate);assert.equal(b.run(),a.run());const baselineReads=a.counts(),candidateReads=b.counts();
 const baselineMedianMs=median(a.run),candidateMedianMs=median(b.run);assert.ok(candidateReads<baselineReads);
 console.log(JSON.stringify({label:'A5-183/A5-189 material passage projection',baselineMedianMs,candidateMedianMs,baselineSourceIdReads:baselineReads,candidateSourceIdReads:candidateReads,sources:1402,uploads:500}));
});
