import {deduplicateQuestions} from './phase2-question-quality.mjs';
/* Invoke in the running app after its corrected bank has loaded. Reports eligibility, not exam guarantees. */
export async function auditCoverage(){
 await window.loadCvp19();await window.Cvp19.ensure();if(window.ensureObjectivePack)await window.ensureObjectivePack();
 const [engine,data,papers,analysis,map]=await Promise.all([import('/cvp-accurate-engine.mjs'),import('/cvp-accurate-data.mjs'),import('/cvp-past-papers.mjs'),import('/exam-analysis.mjs'),import('/cvp-exam-category-map.mjs')]);
 papers.registerCvpPapers(ORIGINAL_EXAMS);window.Cvp19.applyOriginal();
 const permitted=q=>(q.source==='cvp19-corrected'||/^cvp-final-b\d+$/.test(q.source||'')||q.source==='cvp-final-repeat-mock')&&!q.curriculumExcluded&&q.options?.length>=4&&Number.isInteger(q.answer);
 const accurate=[...ORIGINAL_EXAMS.questions.filter(q=>q.source==='cvp19-corrected'||/^cvp-final-b\d+$/.test(q.source||'')),...data.repeatQuestions.map(q=>window.Cvp19.correct(q))].filter(permitted).map(q=>q.lectureIds?.length?q:{...q,lectureIds:[q.lectureId||map.paperLectures[q.id]].filter(Boolean)}).filter(q=>engine.subject(q)&&analysis.classify(q));
 const lectures=DATA.items.filter(x=>x.course==='CVP'||x.course==='MOL');
 const types={normal_all:deduplicateQuestions(ExamEngine.pool(etBank(),'all','all')),normal_exam:deduplicateQuestions(ExamEngine.pool(etBank(),'all','exam')),accurate_cvp:accurate};
 const result={generatedAt:new Date().toISOString(),lectureCount:lectures.length,scopes:{}};
 for(const [name,pool] of Object.entries(types)){const eligible=name==='accurate_cvp'?lectures.filter(x=>x.course==='CVP'):lectures;const mapped=new Set(pool.flatMap(q=>q.lectureIds||[]));result.scopes[name]={questionCount:pool.length,lectureCount:eligible.length,uncovered:eligible.filter(x=>!mapped.has(x.id)).map(x=>({id:x.id,title:x.title}))}}
 return result;
}
