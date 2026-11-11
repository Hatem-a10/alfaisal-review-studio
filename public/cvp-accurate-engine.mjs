/* User-supplied approximate category counts, not an official exam blueprint. */
import {classify,categories} from './exam-analysis.mjs';
export const categoryRanges=Object.fromEntries(categories.map((c,i)=>[c.id,[[7,11],[13,20],[2,6],[1,5],[3,7],[7,12],[2,6],[2,6],[18,27],[14,23],[1,5],[5,11],[1,4]][i]]));
export const sizeRange=[Object.values(categoryRanges).reduce((n,r)=>n+r[0],0),Object.values(categoryRanges).reduce((n,r)=>n+r[1],0)];
export function allocateCategories(count,rng=Math.random){
 if(!Number.isInteger(count)||count<sizeRange[0]||count>sizeRange[1])throw Error('Accurate mode needs '+sizeRange.join('–')+' questions to respect your category ranges.');
 const quotas={},targets={};let sum=0;
 for(const c of categories){const [lo,hi]=categoryRanges[c.id];quotas[c.id]=lo;targets[c.id]=lo+(hi-lo)*rng();sum+=targets[c.id]}
 let assigned=sizeRange[0];while(assigned<count){const candidates=categories.filter(c=>quotas[c.id]<categoryRanges[c.id][1]);candidates.sort((a,b)=>(targets[b.id]/sum*count-quotas[b.id])-(targets[a.id]/sum*count-quotas[a.id]));quotas[candidates[0].id]++;assigned++}return quotas;
}
export function subject(q){const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||'',n=Number(id.match(/\d+$/)?.[0]);if(id.includes('-P'))return n<=15?'cardiac':'pulmonary';if(!n)return null;return [3,7,10,13,17].includes(n)?'histology':[1,9,14,18,20,22,23].includes(n)?'embryology':'anatomy'}
export function chooseAccurate(bank,repeats,count,weights,rng=Math.random){
 const quotas=allocateCategories(count,rng),mandatory=repeats.filter(q=>q.mandatory);
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const seen=new Set(),ids=new Set(),selected=[],counts={},categoryCounts={};
 const signature=q=>q.question.toLowerCase().replace(/[^a-z0-9]/g,'');
 const add=q=>{const key=signature(q);if(seen.has(key)||ids.has(q.id))return false;selected.push(q);seen.add(key);ids.add(q.id);const s=subject(q),c=classify(q);counts[s]=(counts[s]||0)+1;categoryCounts[c]=(categoryCounts[c]||0)+1;return true};mandatory.forEach(add);
 if(categories.some(c=>(categoryCounts[c.id]||0)>quotas[c.id]))throw Error('The mandatory repeat families exceed a category target; the question bank needs review.');
 const candidates=shuffle([...repeats,...bank].filter(q=>subject(q)&&classify(q))),available=()=>candidates.filter(q=>!seen.has(signature(q))&&!ids.has(q.id));
 const sum=Object.values(weights).reduce((a,b)=>a+b,0),common=new Set(repeats.map(q=>q.id));
 const broadDeficit=q=>(weights[subject(q)]||0)/sum*count-(counts[subject(q)]||0);
 for(const c of categories)while((categoryCounts[c.id]||0)<quotas[c.id]){const pool=available().filter(q=>classify(q)===c.id).sort((a,b)=>Number(common.has(b.id))-Number(common.has(a.id))||broadDeficit(b)-broadDeficit(a));if(!pool.length)throw Error(c.id+' does not have '+quotas[c.id]+' distinct questions in this question source. Include concept checks or use a broader CVP bank.');add(pool[0])}
 return {questions:selected,counts,categoryCounts,categoryTargets:quotas,mandatoryIds:mandatory.map(q=>q.id),source:'Your approximate K.01–K.13 category ranges, with all green repeat families. Practice targets, not an official blueprint or prediction.'};
}
