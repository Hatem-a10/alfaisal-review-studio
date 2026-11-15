/* User-supplied approximate category counts, not an official exam blueprint. */
import {nearDuplicate} from './phase2-question-quality.mjs';
import {classify,categories} from './exam-analysis.mjs';
import {paperLectures} from './cvp-exam-category-map.mjs';
export const categoryRanges=Object.fromEntries(categories.map((c,i)=>[c.id,[[7,11],[13,20],[2,6],[1,5],[3,7],[7,12],[2,6],[2,6],[18,27],[14,23],[1,5],[5,11],[1,4]][i]]));
export const sizeRange=[Object.values(categoryRanges).reduce((n,r)=>n+r[0],0),Object.values(categoryRanges).reduce((n,r)=>n+r[1],0)];
export function allocateCategories(count,rng=Math.random){
 if(!Number.isInteger(count)||count<sizeRange[0]||count>sizeRange[1])throw Error('Accurate mode needs '+sizeRange.join('–')+' questions to respect your category ranges.');
 const quotas={},targets={};let sum=0;
 for(const c of categories){const [lo,hi]=categoryRanges[c.id];quotas[c.id]=lo;targets[c.id]=lo+(hi-lo)*rng();sum+=targets[c.id]}
 let assigned=sizeRange[0];while(assigned<count){const candidates=categories.filter(c=>quotas[c.id]<categoryRanges[c.id][1]);candidates.sort((a,b)=>(targets[b.id]/sum*count-quotas[b.id])-(targets[a.id]/sum*count-quotas[a.id]));quotas[candidates[0].id]++;assigned++}return quotas;
}
export function subject(q){const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||'',n=Number(id.match(/\d+$/)?.[0]);if(id.includes('-P'))return n<=15?'cardiac':'pulmonary';if(!n)return null;return [3,7,10,13,17].includes(n)?'histology':[1,9,14,18,20,22,23].includes(n)?'embryology':'anatomy'}
export const hasQuestionImage=q=>!!(q.image||q.figures?.some(f=>f.image));
function chooseAccurateOnce(bank,repeats,count,weights,rng,attempt){
 const permitted=q=>q.source==='cvp19-corrected'||/^cvp-final-b\d+$/.test(q.source||'')||q.source==='cvp-final-repeat-mock'||['shams','faculty','tbl','booklet','previous'].includes(q.verifiedMockSource);
 bank=bank.filter(q=>permitted(q)&&!q.curriculumExcluded&&q.options?.length>=4&&Number.isInteger(q.answer));repeats=repeats.filter(q=>permitted(q)&&!q.curriculumExcluded&&q.options?.length>=4&&Number.isInteger(q.answer));
 const quotas=allocateCategories(count,rng),mandatory=repeats.filter(q=>q.mandatory);
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const seen=new Set(),ids=new Set(),selected=[],counts={},categoryCounts={};
 const signature=q=>q.question.toLowerCase().replace(/[^a-z0-9]/g,'');
 const similarityCache=new WeakMap();
 const collides=q=>{if(ids.has(q.id)||seen.has(signature(q)))return true;let cached=similarityCache.get(q)||{checked:0,match:false};while(!cached.match&&cached.checked<selected.length)cached.match=nearDuplicate(selected[cached.checked++],q);similarityCache.set(q,cached);return cached.match};
 const add=q=>{q={...q,kind:q.kind||'Past paper',explanation:q.explanation||q.sourceExplanation||('Source key: '+(q.printedAnswer||String.fromCharCode(65+q.answer))),reasons:q.reasons||q.options.map(()=>''),lectureIds:q.lectureIds?.length?q.lectureIds:[q.lectureId||paperLectures[q.id]].filter(Boolean)};const key=signature(q);if(collides(q))return false;selected.push(q);seen.add(key);ids.add(q.id);const s=subject(q),c=classify(q);counts[s]=(counts[s]||0)+1;categoryCounts[c]=(categoryCounts[c]||0)+1;return true};for(const q of mandatory)if(!add(q))throw Error('Mandatory repeat families contain duplicate or near-duplicate questions; the question bank needs review.');
 if(categories.some(c=>(categoryCounts[c.id]||0)>quotas[c.id]))throw Error('The mandatory repeat families exceed a category target; the question bank needs review.');
 const candidates=shuffle([...repeats,...bank].map(q=>q.lectureIds?.length?q:{...q,lectureIds:[q.lectureId||paperLectures[q.id]].filter(Boolean)}).filter(q=>subject(q)&&classify(q)));if(attempt&&candidates.length)candidates.push(...candidates.splice(0,attempt%candidates.length));const available=()=>candidates.filter(q=>!collides(q));
 const sum=Object.values(weights).reduce((a,b)=>a+b,0),common=new Set(repeats.map(q=>q.id));
 const imageTarget=10+Math.min(6,Math.floor(rng()*7));let imageCount=selected.filter(hasQuestionImage).length;
 const broadDeficit=q=>(weights[subject(q)]||0)/sum*count-(counts[subject(q)]||0);
 // Reserve actual question figures before filling text questions, without exceeding any category quota.
 while(imageCount<imageTarget){const images=available().filter(q=>hasQuestionImage(q)&&(categoryCounts[classify(q)]||0)<quotas[classify(q)]);if(!images.length)throw Error('There are not enough eligible image questions for an Accurate exam. Include more source types.');images.sort((a,b)=>((categoryCounts[classify(a)]||0)/quotas[classify(a)])-((categoryCounts[classify(b)]||0)/quotas[classify(b)]));add(images[0]);imageCount++}
 for(const c of categories)while((categoryCounts[c.id]||0)<quotas[c.id]){const pool=available().filter(q=>classify(q)===c.id&&!hasQuestionImage(q)).sort((a,b)=>Number(common.has(b.id))-Number(common.has(a.id))||broadDeficit(b)-broadDeficit(a));if(!pool.length)throw Error(c.id+' does not have enough distinct text questions for this image-balanced exam. Include more source types.');add(pool[0])}

 return {questions:selected,counts,categoryCounts,categoryTargets:quotas,imageCount,mandatoryIds:mandatory.map(q=>q.id),source:'Your approximate K.01–K.13 category ranges, with 10–16 image questions and all green repeat families. Practice targets, not an official blueprint or prediction.'};
}

export function chooseAccurate(bank,repeats,count,weights,rng=Math.random){let error;for(let attempt=0;attempt<8;attempt++){try{return chooseAccurateOnce(bank,repeats,count,weights,rng,attempt)}catch(e){error=e;if(!/not enough eligible image|not have enough distinct text/.test(e.message))throw e}}throw error}
