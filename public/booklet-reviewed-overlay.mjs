// Reviewed answers for the private MOL/REN booklet packs.
// The overlay itself is private (served from R2 like the packs); this module only applies it.
// Every change is guarded: a question is updated only when its served answer choices still match
// the source choices the review was written against, so a regenerated pack is never mislabelled.
export const reviewedOverlayPaths=Object.freeze({
 MOL:'/api/site-assets/materials/mol114/booklet-reviewed-v2.json',
 REN:'/api/site-assets/materials/ren123/booklet-reviewed-v2.json',
});
const norm=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const sameList=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);

function validItem(item,version){
 if(!item||typeof item!=='object'||!Array.isArray(item.options)||item.options.length<2||item.options.some(o=>typeof o!=='string'||!o.trim()))return false;
 const keys=item.accepted??[item.answer];
 if(!Number.isInteger(item.answer)||!Array.isArray(keys)||!keys.length||keys.some(i=>!Number.isInteger(i)||i<0||i>=item.options.length)||!keys.includes(item.answer))return false;
 if(!Array.isArray(item.reasons)||item.reasons.length!==item.options.length||item.reasons.some(r=>typeof r!=='string'||!r.trim()))return false;
 if(typeof item.explanation!=='string'||!item.explanation.trim())return false;
 if(item.question!==undefined&&(typeof item.question!=='string'||!item.question.trim()))return false;
 return Array.isArray(item.match)&&item.match.length>0&&item.match.every(list=>Array.isArray(list)&&list.length>=2&&list.every(text=>typeof text==='string')&&(version===2||list.length===item.options.length));
}

export function applyReviewedOverlay(pack,overlay,course){
 if(!overlay||![1,2].includes(overlay.version)||overlay.course!==course||!overlay.items||typeof overlay.items!=='object')throw Error('Invalid reviewed-answer data.');
 const byStem=new Map();
 if(overlay.version===1){
  for(const [id,item] of Object.entries(overlay.items))if(item&&Number.isSafeInteger(item.page)&&typeof item.stem==='string')byStem.set(item.page+'|'+item.stem,id);
 }
 let applied=0,skipped=0;
 const questions=pack.questions.map(q=>{
  if(q.type!=='mcq'||!Array.isArray(q.options))return q;
  const id=Object.hasOwn(overlay.items,q.id)?q.id:overlay.version===1?byStem.get(q.page+'|'+norm(q.question)):null;
  const item=id&&overlay.items[id];
  if(!item)return q;
  const served=q.options.map(norm);
  if(!validItem(item,overlay.version)||(overlay.version===2&&(item.page!==q.page||item.stem!==norm(q.question)))||!item.match.some(list=>sameList(list,served))){skipped++;return q}
  applied++;
  const next={...q,question:item.question??q.question,options:[...item.options],answer:item.answer,acceptedAnswers:[...(item.accepted??[item.answer])],reasons:[...item.reasons],explanation:item.explanation,reviewed:true};
  if(overlay.version===2){
   next.choiceRevision='reviewed-v2';
   next.previousOptions=q.options;
  }
  delete next.sourceIssue;
  return next;
 });
 return {pack:{...pack,questions},applied,skipped};
}

// Load the overlay. A missing overlay (404) is not an error: the pack is shown as published.
export async function fetchReviewedOverlay(url,{fetcher=globalThis.fetch,signal}={}){
 const response=await fetcher(url,{credentials:'same-origin',signal});
 if(response.status===404)return null;
 if(!response.ok)throw Error('Could not load the reviewed booklet answers.');
 return response.json();
}
