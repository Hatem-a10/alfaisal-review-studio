import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function assembledLearning(){
 const files=['learning-data.js','teaching-data.js','cvp-week2-data.js','cvp-week2-lessons.js','cvp-week2-expanded.js'];
 const src=files.map(f=>readFileSync(root+'public/'+f,'utf8')).join('\n');
 const checks=runInNewContext(readFileSync(root+'public/topic-checks.js','utf8')+';TOPIC_CHECKS');
 const context={render(){},TOPIC_CHECKS:checks,inlineLessonCache:new Map()};
 const {learning,teaching}=runInNewContext(src+';({learning:LEARNING,teaching:TEACHING})',context);
 const pack=runInNewContext(readFileSync(root+'public/cvp-week3-data.js','utf8')+';CVP_WEEK3');
 for(const s of pack.sources)if(!learning.sources.some(x=>x.id===s.id))learning.sources.push(s);
 for(const [id,g]of Object.entries(pack.guides)){teaching.guides[id]=g;for(const s of g.sections)for(const q of s.questions)if(!learning.questions.some(x=>x.id===q.id))learning.questions.push(q);const l=learning.lessons.find(x=>x.id===id);l.references??=[];if(!l.references.some(r=>r.source==='cvp-w3-'+id.slice(4).toLowerCase()))l.references.unshift({source:'cvp-w3-'+id.slice(4).toLowerCase(),page:1});l.scope='Expanded from the supplied lecture: '+g.title+'. Original tracker title/dates retained.';l.sourceCoverage={source:'cvp-w3-'+id.slice(4).toLowerCase(),read:true,unreadablePages:id==='CVP-A13'?[14,22]:[],originalStorage:'Original upload handled separately; extracted source text and cropped figures available here'}}
 for (const guide of Object.values(pack.guides)) for (const section of guide.sections) checks[section.id]=section.questions;
 const transcriptContext={LEARNING:learning,TEACHING:teaching,TOPIC_CHECKS:checks,DIAGRAMS:{},inlineLessonCache:new Map()};
 for(const file of ['cvp-transcript-sources.js','cvp-transcript-anatomy.js','cvp-transcript-physiology.js'])runInNewContext(readFileSync(root+'public/'+file,'utf8'),transcriptContext);
 const pulmonaryFiles=['cvp-pulmonary-anatomy-data.js','cvp-pulmonary-physiology-data.js','cvp-pulmonary-quiz-data.js','cvp-pulmonary-core.js'];
 const pulmonaryCode=pulmonaryFiles.map(file=>readFileSync(root+'public/'+file,'utf8')).join('\n');
 runInNewContext(pulmonaryCode+';applyPulmonaryContent(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,[CVP_PULMONARY_ANATOMY,CVP_PULMONARY_PHYSIOLOGY],CVP_PULMONARY_QUIZ);applyPulmonaryQuiz(LEARNING,TEACHING,TOPIC_CHECKS,CVP_PULMONARY_QUIZ);',transcriptContext);
 const transcriptPatchCode=['cvp-pulmonary-transcript-data.js','cvp-pulmonary-transcript-core.js'].map(file=>readFileSync(root+'public/'+file,'utf8')).join('\n');
 runInNewContext(transcriptPatchCode+';applyPulmonaryTranscripts(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,CVP_PULMONARY_TRANSCRIPTS);',transcriptContext);
 const metabolismCode=['mol-metabolism-data.js','mol-metabolism-core.js'].map(file=>readFileSync(root+'public/'+file,'utf8')).join('\n');
 runInNewContext(metabolismCode+';applyMetabolismContent(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,MOL_METABOLISM);',transcriptContext);
 const nextCode=['respiratory-next-data.js','respiratory-next-core.js'].map(file=>readFileSync(root+'public/'+file,'utf8')).join('\n');
 runInNewContext(nextCode+';applyRespiratoryNext(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,RESPIRATORY_NEXT);',transcriptContext);
 for (const file of ['lesson-depth-data.js', 'lesson-depth-core.js', 'lesson-depth-runtime.js']) {
  runInNewContext(readFileSync(root+'public/'+file,'utf8'), transcriptContext);
 }
 const expansion=JSON.parse(readFileSync(root+'public/lesson-expansion-data.json','utf8'));
 const applyExpansion=runInNewContext(readFileSync(root+'public/lesson-expansion.js','utf8')+';applyLessonExpansion');
 const lab=JSON.parse(readFileSync(root+'public/cvp-source-walkthroughs.json','utf8'));
 applyExpansion(learning,teaching,checks,expansion);
 applyExpansion(learning,teaching,checks,lab);
 const supplemental=JSON.parse(readFileSync(root+'public/supplemental-objective-questions.json','utf8'));
 const {applySupplementalObjectives,applyTopicTakeaways}=runInNewContext(readFileSync(root+'public/supplemental-objectives.js','utf8').split('(()=>{')[0]+';({applySupplementalObjectives,applyTopicTakeaways})');
 applySupplementalObjectives(learning,checks,supplemental);
 const takeaways=JSON.parse(readFileSync(root+'public/topic-takeaways.json','utf8'));
 applyTopicTakeaways(teaching,takeaways);
 const baseDiagrams=runInNewContext(readFileSync(root+'public/diagram-data.js','utf8')+';DIAGRAMS');
 return {learning,teaching,pack,checks,diagrams:{...baseDiagrams,...pack.diagrams,...transcriptContext.DIAGRAMS}};
}
