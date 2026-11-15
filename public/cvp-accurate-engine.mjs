/* Practice proportions are preferences, never category floors or ceilings. */
import {nearDuplicate} from './phase2-question-quality.mjs';
import {classify,categories} from './exam-analysis.mjs';
import {paperLectures} from './cvp-exam-category-map.mjs';
export const categoryRanges=Object.fromEntries(categories.map((c,i)=>[c.id,[[7,11],[13,20],[2,6],[1,5],[3,7],[7,12],[2,6],[2,6],[18,27],[14,23],[1,5],[5,11],[1,4]][i]]));
export const sizeRange=[20,200];
export function allocateCategories(count){const weights=categories.map(c=>categoryRanges[c.id].reduce((a,b)=>a+b)/2),sum=weights.reduce((a,b)=>a+b);return Object.fromEntries(categories.map((c,i)=>[c.id,count*weights[i]/sum]))}
export function subject(q){const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||'',n=Number(id.match(/\d+$/)?.[0]);if(id.includes('-P'))return n<=15?'cardiac':'pulmonary';if(!n)return null;return [3,7,10,13,17].includes(n)?'histology':[1,9,14,18,20,22,23].includes(n)?'embryology':'anatomy'}
export const hasQuestionImage=q=>!!(q.image||q.figures?.some(f=>f.image));
export function chooseAccurate(bank,repeats,count,weights,rng=Math.random){
 if(!Number.isInteger(count)||count<20||count>200)throw Error('Choose 20–200 questions for Accurate practice.');
 const permitted=q=>q.source==='cvp19-corrected'||/^cvp-final-b\d+$/.test(q.source||'')||q.source==='cvp-final-repeat-mock'||['shams','faculty','tbl','booklet','previous'].includes(q.verifiedMockSource);
 const eligible=q=>permitted(q)&&!q.curriculumExcluded&&q.options?.length>=4&&Number.isInteger(q.answer);
 const prepared=q=>({...q,kind:q.kind||'Past paper',explanation:q.explanation||q.sourceExplanation||('Printed key: '+(q.printedAnswer||String.fromCharCode(65+q.answer))),reasons:q.reasons||q.options.map(()=>''),lectureIds:q.lectureIds?.length?q.lectureIds:[q.lectureId||paperLectures[q.id]].filter(Boolean)});
 const pool=[...repeats,...bank].filter(eligible).map(prepared).map(q=>({q,tie:rng()})).sort((a,b)=>a.tie-b.tie).map(x=>x.q),mandatory=repeats.filter(q=>q.mandatory&&eligible(q)).map(prepared),common=new Set(repeats.map(q=>q.id)),selected=[],ids=new Set(),seen=new Set(),counts={},categoryCounts={},targets=allocateCategories(count);
 const signature=q=>(q.question||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const similarity=new WeakMap();const collides=q=>{if(ids.has(q.id)||seen.has(signature(q)))return true;const c=similarity.get(q)||{checked:0,match:false};while(!c.match&&c.checked<selected.length)c.match=nearDuplicate(selected[c.checked++],q);similarity.set(q,c);return c.match};
 const add=q=>{if(collides(q))return false;selected.push(q);ids.add(q.id);seen.add(signature(q));const s=subject(q),c=classify(q);counts[s]=(counts[s]||0)+1;if(c)categoryCounts[c]=(categoryCounts[c]||0)+1;return true};
 for(const q of mandatory)if(!add(q))throw Error('Required repeat families overlap; unable to build this mock.');
 let imageCount=selected.filter(hasQuestionImage).length;const imageTarget=Math.max(imageCount,Math.min(10+Math.min(6,Math.floor(rng()*7)),count-selected.length+imageCount));
 const deficit=q=>{const c=classify(q);return c?(targets[c]-(categoryCounts[c]||0))/Math.max(1,targets[c]):0};
 while(imageCount<imageTarget){const q=pool.filter(q=>hasQuestionImage(q)&&!collides(q)).sort((a,b)=>deficit(b)-deficit(a))[0];if(!q)throw Error('Selected sources do not contain enough distinct image questions. Enable more sources.');add(q);imageCount++}
 while(selected.length<count){const q=pool.filter(q=>!hasQuestionImage(q)&&!collides(q)).sort((a,b)=>(deficit(b)+Number(common.has(b.id))*.25)-(deficit(a)+Number(common.has(a.id))*.25))[0];if(!q)throw Error('Selected sources do not contain enough distinct questions. Enable more sources or reduce the count.');add(q)}
 return {questions:selected,counts,categoryCounts,categoryTargets:null,imageCount,mandatoryIds:mandatory.map(q=>q.id),source:'Flexible category balance, 10–16 image questions and required green repeat families. No category count limits.'};
}
