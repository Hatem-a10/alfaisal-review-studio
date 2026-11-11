/* Approximate subject mix in incomplete 14th–18th student recalls. */
import {classify,categories} from './exam-analysis.mjs';
import {historicalCategoryCounts} from './cvp-exam-category-map.mjs';
export function subject(q){const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||'',n=Number(id.match(/\d+$/)?.[0]);if(id.includes('-P'))return n<=15?'cardiac':'pulmonary';if(!n)return null;return [3,7,10,13,17].includes(n)?'histology':[1,9,14,18,20,22,23].includes(n)?'embryology':'anatomy'}
export function chooseAccurate(bank,repeats,count,weights,rng=Math.random){
 const mandatory=repeats.filter(q=>q.mandatory),minimum=categories.length*4;
 if(!Number.isInteger(count)||count<minimum||count>200)throw Error('Accurate mode needs '+minimum+'–200 questions: at least four in every K.01–K.13 category.');
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const seen=new Set(),ids=new Set(),selected=[],counts={},categoryCounts={};
 const signature=q=>q.question.toLowerCase().replace(/[^a-z0-9]/g,'');
 const add=q=>{const key=signature(q);if(seen.has(key)||ids.has(q.id))return false;selected.push(q);seen.add(key);ids.add(q.id);const s=subject(q),c=classify(q);counts[s]=(counts[s]||0)+1;categoryCounts[c]=(categoryCounts[c]||0)+1;return true};mandatory.forEach(add);
 const candidates=shuffle([...repeats,...bank].filter(q=>subject(q)&&classify(q))),available=()=>candidates.filter(q=>!seen.has(signature(q))&&!ids.has(q.id));
 const sum=Object.values(weights).reduce((a,b)=>a+b,0),categorySum=Object.values(historicalCategoryCounts).reduce((a,b)=>a+b,0),common=new Set(repeats.map(q=>q.id));
 const broadDeficit=q=>(weights[subject(q)]||0)/sum*count-(counts[subject(q)]||0);
 // Mandatory green families count toward the four-question floor. Prefer verified common repeats within those floors.
 for(const c of categories)while((categoryCounts[c.id]||0)<4){const pool=available().filter(q=>classify(q)===c.id).sort((a,b)=>Number(common.has(b.id))-Number(common.has(a.id))||broadDeficit(b)-broadDeficit(a));if(!pool.length)throw Error(c.id+' does not have four distinct questions in this question source. Include concept checks or use a broader CVP bank.');add(pool[0])}
 if(selected.length>count)throw Error('Choose a larger exam to include every green repeat and all category minimums.');
 // Fill spare places toward the recovered papers' category proportions; broader subject mix breaks ties.
 while(selected.length<count){const pool=available();if(!pool.length)throw Error('There are not enough distinct CVP questions for this exam size.');const deficit=q=>(historicalCategoryCounts[classify(q)]||0)/categorySum*count-(categoryCounts[classify(q)]||0);pool.sort((a,b)=>deficit(b)-deficit(a)||broadDeficit(b)-broadDeficit(a));add(pool[0])}
 return {questions:selected,counts,categoryCounts,mandatoryIds:mandatory.map(q=>q.id),source:'At least four questions per K.01–K.13 category; remaining places approximate the supplied 14th–18th recalls. Not an official blueprint or prediction.'};
}
