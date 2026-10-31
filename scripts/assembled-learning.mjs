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
 return {learning,teaching,pack};
}
