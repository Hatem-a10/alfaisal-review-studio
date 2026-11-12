/* Source corrections are applied by stable ID; active attempts keep their own snapshots. */
export const normalize=t=>(t||'').toLowerCase().replace(/\(\s*repeated[^)]*\)/g,'').replace(/[^a-z0-9]/g,'');
export function indexes(pack){const byId=new Map(pack.questions.map(q=>[q.id,q])),byStem=new Map();for(const q of pack.questions)if(q.type==='mcq')byStem.set(normalize(q.question),byId.get(q.canonicalId)||q);return {byId,byStem}}
export function correctedQuestion(q,pack,index=indexes(pack)){
 if(q.bookletRevision===pack.revision)return q;
 const canonical=index.byId.get(pack.patches[q.id])||((q.lectureIds?.some(id=>id.startsWith('CVP-'))||q.lectureId?.startsWith('CVP-')||/^cvp|original-cvp/.test(q.source||''))&&index.byStem.get(normalize(q.question)));
 if(!canonical)return q;
 const result={...q,...canonical,id:q.id,priorSource:q.priorSource||q.source,bookletCanonicalId:canonical.canonicalId||canonical.id,legacyOptions:q.options,mandatory:q.mandatory,repeat:q.repeat,repeatLabel:q.repeatLabel,bookletRevision:pack.revision};
 // Old distractor explanations must never contradict the newly supplied options/key.
 if(!canonical.reasons)delete result.reasons;if(canonical.figures?.length){delete result.image;delete result.imageAlt;}
 result.sourceExplanation=canonical.explanation;result.sourceIssue=canonical.sourceIssue||'';return result;
}
export function registerOriginals(target,pack){const index=indexes(pack);target.questions=target.questions.map(q=>correctedQuestion(q,pack,index));if(!target.sources.some(s=>s.id===pack.source.id))target.sources.push(pack.source);for(const q of pack.questions)if(!target.questions.some(x=>x.id===q.id))target.questions.push(q);for(const set of pack.sets)if(!target.sets.some(x=>x.id===set.id))target.sets.push(set)}
export function integrateLearning(learning,checks,pack){const index=indexes(pack),represented=new Set();
 const fix=q=>{const c=correctedQuestion(q,pack,index);if(c.bookletCanonicalId||c.canonicalId)represented.add(c.bookletCanonicalId||c.canonicalId);return c};
 learning.questions=learning.questions.map(fix).filter(q=>!q.curriculumExcluded);for(const id of Object.keys(checks))checks[id]=checks[id].map(fix).filter(q=>!q.curriculumExcluded);
 for(const q of pack.questions)if(q.type==='mcq'&&q.canonicalId===q.id&&Number.isInteger(q.answer)&&q.options.length>=4&&!q.curriculumExcluded&&!represented.has(q.id)){learning.questions.push(q);represented.add(q.id)}
 if(!learning.sources.some(s=>s.id===pack.source.id))learning.sources.push({...pack.source,name:pack.source.title,displayName:pack.source.title,unit:'page',readingURL:'/cvp19-source-pages.json',pages:Array.from({length:383},(_,i)=>({page:i+1,text:''}))});
 return represented.size;
}
export async function load(){const r=await fetch('/cvp19-booklet.json?v=149');if(!r.ok)throw Error('The corrected CVP booklet could not load. Please retry.');const p=await r.json();if(p.version!==1||p.questions.length!==1214)throw Error('Incomplete corrected booklet data');return p}

// Migrate unfinished local drafts by option TEXT, never by assuming an old index still means the same thing.
export function migrateDrafts(drafts,oldQuestions,pack){const next=structuredClone(drafts),index=indexes(pack),oldById=new Map(oldQuestions.map(q=>[q.id,q]));for(const draft of Object.values(next)){if(draft.bookletRevision===pack.revision||!Array.isArray(draft.ids))continue;for(let i=0;i<draft.ids.length;i++){const old=oldById.get(draft.ids[i]);if(!old)continue;const corrected=correctedQuestion(old,pack,index);if(corrected===old)continue;const map=old.options.map(o=>corrected.options.findIndex(n=>normalize(n)===normalize(o))),order=draft.orders?.[i];if(!Array.isArray(order))continue;if(map.every(n=>n>=0)&&old.options.length===corrected.options.length&&new Set(map).size===map.length){draft.orders[i]=order.map(n=>map[n]);if(Number.isInteger(draft.answers?.[i]))draft.answers[i]=map[draft.answers[i]]}else{draft.priorBookletAnswers??={};draft.priorBookletAnswers[draft.ids[i]]={options:old.options,selected:draft.answers?.[i]??null};draft.orders[i]=corrected.options.map((_,n)=>n);if(draft.answers)delete draft.answers[i];if(draft.graded)delete draft.graded[i]}}draft.bookletRevision=pack.revision}return next}
