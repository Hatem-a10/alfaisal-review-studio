let pending;
const originalGroups=MockSources.groups;
const tbl19Ids=new Set();
function groups(q,sources){const before=originalGroups(q,sources),is19=tbl19Ids.has(q.id)||/^cvp19-tbl-[1-5]$/.test(q.source||''),oldTbl=before.includes('tbl')&&!is19;const result=before.filter(k=>k!=='tbl'&&!((oldTbl||is19)&&k==='previous'));if(is19)result.push('tbl');return [...new Set(result)]}
MockSources.groups=groups;
MockSources.filter=function(bank,course,sources=[]){const active=MockSources.choices();return bank.filter(q=>{const ids=q.lectureIds?.length?q.lectureIds:[q.lectureId].filter(Boolean);return !q.cancelled&&ids.length&&ids.every(id=>id.startsWith(course+'-'))&&groups(q,sources).some(k=>active[k])}).map(q=>({...q,verifiedMockSource:groups(q,sources).find(k=>active[k])}))};
export function loadTbl19(){return pending??=fetch('/tbl19-questions.json').then(r=>{if(!r.ok)throw Error('Batch 19 TBLs could not load');return r.json()}).then(pack=>{for(const source of pack.sources)if(!ORIGINAL_EXAMS.sources.some(s=>s.id===source.id))ORIGINAL_EXAMS.sources.push(source);for(const q of pack.questions){tbl19Ids.add(q.id);if(!ORIGINAL_EXAMS.questions.some(x=>x.id===q.id))ORIGINAL_EXAMS.questions.push(q)}for(const set of pack.sets)if(!ORIGINAL_EXAMS.sets.some(s=>s.id===set.id))ORIGINAL_EXAMS.sets.push(set);return pack}).catch(e=>{pending=null;throw e})}
// Only an explicitly accepted alternative key changes scoring; canonical source data stays intact.
const accepted=(q,a)=>Number.isInteger(a)&&q.acceptedAnswers?.includes(a);
const shuffle=etShuffleQuestion;etShuffleQuestion=function(q){const result=shuffle(q);if(q.acceptedAnswers)result.acceptedAnswers=q.acceptedAnswers.map(i=>result.options.indexOf(q.options[i]));return result};
const change=ExamEngine.recordChange;ExamEngine.recordChange=function(exam,index,choice){const q=exam.questions[index];if(!q.acceptedAnswers)return change(exam,index,choice);const xp=exam.xp??={},old=Number.isInteger(exam.answers[index])?exam.answers[index]:xp.lastChoices?.[index];if(Number.isInteger(old)&&old!==choice&&accepted(q,old)&&!accepted(q,choice)){xp.rightToWrong??={};xp.rightToWrong[index]=(xp.rightToWrong[index]||0)+1}exam.answers[index]=choice;xp.lastChoices??={};xp.lastChoices[index]=choice};
const finish=etFinishExam;etFinishExam=function(...args){if(etExam)etExam.questions=etExam.questions.map((q,i)=>accepted(q,etExam.answers?.[i])?{...q,primaryPrintedAnswerIndex:q.primaryPrintedAnswerIndex??q.answer,answer:etExam.answers[i]}:q);return finish(...args)};
const grade=ExamEngine.grade;ExamEngine.grade=function(exam){return grade({...exam,questions:exam.questions.map((q,i)=>accepted(q,exam.answers?.[i])?{...q,answer:exam.answers[i]}:q)})};
const record=etRecordSet;etRecordSet=function(qs,answers,...rest){return record(qs.map((q,i)=>accepted(q,answers[i])?{...q,answer:answers[i]}:q),answers,...rest)};ExamTools.recordSet=etRecordSet;
const markup=etQuestionMarkup;etQuestionMarkup=function(q,i,answers,finished,...rest){return markup(finished&&accepted(q,answers?.[i])?{...q,answer:answers[i]}:q,i,answers,finished,...rest)};
const byId=originalQuestionById;originalQuestionById=function(id){const q=byId(id),a=typeof originalRun!=='undefined'?originalRun?.answers?.[id]:undefined;return originalRun?.finishedAt&&q&&accepted(q,a)?{...q,answer:a}:q};
await loadTbl19();
