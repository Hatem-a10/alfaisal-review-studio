import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gzipSync} from 'node:zlib';
import {assembledLearning} from './assembled-learning.mjs';

const root=new URL('../',import.meta.url);
const group=runInNewContext(readFileSync(new URL('public/inline-topics.js',root),'utf8')
 .split('let inlineLessonCache')[0]+';InlineTopics.group');

export function buildStudentLessons() {
 const {learning,teaching,checks}=assembledLearning();
 const bank=new Map();
 for(const question of [...learning.questions,...Object.values(checks).flat()]) {
  if (!bank.has(question.id) && !question.duplicateOf && question.options?.length>=4 &&
      Number.isInteger(question.answer) && question.answer>=0 && question.answer<question.options.length)
   bank.set(question.id,question);
 }
 const packs={};
 for(const lesson of learning.lessons) {
  const topics=teaching.guides[lesson.id]?.sections||lesson.facts.map(fact=>({
   id:fact.id,concept:fact.id,title:fact.concept,body:[fact.answer,fact.teach]
  }));
  const pool=[...bank.values()].filter(question=>question.lectureIds.includes(lesson.id)).map(question=>{
   const objectiveId=question.objectiveByLecture?.[lesson.id];
   return objectiveId?{...question,objectiveId}:question;
  });
  const assigned=group(topics,pool,checks);
  const pack=topics.map(({id,title,body,paragraphs,keyPoints},index)=>({
   id,title,body:body||paragraphs||[],keyPoints:keyPoints||[],
   questions:assigned[index].map(({id,question,options,answer,reasons,explanation})=>({
    id,question,options,answer,reasons,explanation
   }))
  }));
  packs[lesson.id]=gzipSync(JSON.stringify(pack)).toString('base64');
 }
 writeFileSync(new URL('lib/student-lesson-packs.generated.ts',root),
  'export const studentLessonPacks: Record<string,string> = '+JSON.stringify(packs)+';\n');
}
