/* Approximate broad subject mix in incomplete 14th–18th student recalls. */
export function subject(q){const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||'',n=Number(id.match(/\d+$/)?.[0]);if(id.includes('-P'))return n<=15?'cardiac':'pulmonary';if(!n)return null;return [3,7,10,13,17].includes(n)?'histology':[1,9,14,18,22].includes(n)?'embryology':'anatomy'}
export function chooseAccurate(bank,repeats,count,weights,rng=Math.random){
 const mandatory=repeats.filter(q=>q.mandatory);if(!Number.isInteger(count)||count<mandatory.length||count>200)throw Error('Accurate mode needs '+mandatory.length+'–200 questions to include every green repeat.');
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const seen=new Set(),ids=new Set(),selected=[],counts={};
 const signature=q=>q.question.toLowerCase().replace(/[^a-z0-9]/g,'');
 const add=q=>{const key=signature(q);if(seen.has(key)||ids.has(q.id))return false;selected.push(q);seen.add(key);ids.add(q.id);const s=subject(q);counts[s]=(counts[s]||0)+1;return true};mandatory.forEach(add);
 // A small variable portion of the exam comes from verified three-batch repeats.
 for(const q of shuffle(repeats.filter(q=>!q.mandatory)).slice(0,Math.min(13,Math.max(0,Math.ceil((count-mandatory.length)*.35))))){if(selected.length<count)add(q)}
 const candidates=shuffle(bank.filter(q=>subject(q)&&q.lectureIds.some(id=>id.startsWith('CVP-'))));const sum=Object.values(weights).reduce((a,b)=>a+b,0);
 while(selected.length<count){const available=candidates.filter(q=>!seen.has(signature(q))&&!ids.has(q.id));if(!available.length)throw Error('There are not enough distinct CVP questions for this exam size.');const groups=[...new Set(available.map(subject))].sort((a,b)=>((weights[b]||0)/sum*count-(counts[b]||0))-((weights[a]||0)/sum*count-(counts[a]||0)));add(available.find(q=>subject(q)===groups[0]));}
 return {questions:selected,counts,mandatoryIds:mandatory.map(q=>q.id),source:'Approximate broad subject distribution from 324 provisionally classified recovered MCQs; not an official blueprint or prediction.'};
}
