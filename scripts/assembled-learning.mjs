import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function assembledLearning(){
 const files=['learning-data.js','teaching-data.js','cvp-week2-data.js','cvp-week2-lessons.js','cvp-week2-expanded.js'];
 const src=files.map(f=>readFileSync(root+'public/'+f,'utf8')).join('\n');
 const context={render(){},TOPIC_CHECKS:{},inlineLessonCache:new Map()};
 const {learning,teaching}=runInNewContext(src+';({learning:LEARNING,teaching:TEACHING})',context);
 const pack=runInNewContext(readFileSync(root+'public/cvp-week3-data.js','utf8')+';CVP_WEEK3');
 for(const s of pack.sources)if(!learning.sources.some(x=>x.id===s.id))learning.sources.push(s);
 for(const [id,g]of Object.entries(pack.guides)){teaching.guides[id]=g;for(const s of g.sections)for(const q of s.questions)if(!learning.questions.some(x=>x.id===q.id))learning.questions.push(q);const l=learning.lessons.find(x=>x.id===id);l.references??=[];if(!l.references.some(r=>r.source==='cvp-w3-'+id.slice(4).toLowerCase()))l.references.unshift({source:'cvp-w3-'+id.slice(4).toLowerCase(),page:1});l.scope='Expanded from the supplied lecture: '+g.title+'. Original tracker title/dates retained.';l.sourceCoverage={source:'cvp-w3-'+id.slice(4).toLowerCase(),read:true,unreadablePages:id==='CVP-A13'?[14,22]:[],originalStorage:'Original upload handled separately; extracted source text and cropped figures available here'}}
 const checks={};for(const guide of Object.values(teaching.guides))for(const section of guide.sections||[])checks[section.id]=section.questions||[];
 const transcriptContext={LEARNING:learning,TEACHING:teaching,TOPIC_CHECKS:checks,DIAGRAMS:{},inlineLessonCache:new Map()};
 for(const file of ['cvp-transcript-sources.js','cvp-transcript-anatomy.js','cvp-transcript-physiology.js'])runInNewContext(readFileSync(root+'public/'+file,'utf8'),transcriptContext);
 const pulmonaryFiles=['cvp-pulmonary-anatomy-data.js','cvp-pulmonary-physiology-data.js','cvp-pulmonary-quiz-data.js','cvp-pulmonary-core.js'];
 const pulmonaryCode=pulmonaryFiles.map(file=>readFileSync(root+'public/'+file,'utf8')).join('\n');
 runInNewContext(pulmonaryCode+';applyPulmonaryContent(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,[CVP_PULMONARY_ANATOMY,CVP_PULMONARY_PHYSIOLOGY],CVP_PULMONARY_QUIZ);applyPulmonaryQuiz(LEARNING,TEACHING,TOPIC_CHECKS,CVP_PULMONARY_QUIZ);',transcriptContext);
 return {learning,teaching,pack};
}
