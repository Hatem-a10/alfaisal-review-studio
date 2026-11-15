/* Original faculty collection: preserve its choices and printed keys. */
let pending;
export function loadFacultyQuestions(){return pending??=fetch('/faculty-question-bank.json').then(r=>{if(!r.ok)throw Error('Faculty questions could not load');return r.json()}).then(pack=>{if(!ORIGINAL_EXAMS.sources.some(s=>s.id===pack.source.id))ORIGINAL_EXAMS.sources.push(pack.source);for(const q of pack.questions)if(!ORIGINAL_EXAMS.questions.some(x=>x.id===q.id))ORIGINAL_EXAMS.questions.push(q);for(const set of pack.sets)if(!ORIGINAL_EXAMS.sets.some(x=>x.id===set.id))ORIGINAL_EXAMS.sets.push(set);return pack}).catch(e=>{pending=null;throw e})}
window.loadFacultyQuestions=loadFacultyQuestions;
await loadFacultyQuestions();
if(typeof view!=='undefined'&&view==='practice')render();
