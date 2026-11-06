'use strict';
/* Additive source audit: no progress, review dates, exam attempts or answers are mutated. */
function applyPulmonaryTranscripts(learning,teaching,checks,diagrams,pack){
 const append=(object,key,values=[])=>{object[key]??=[];for(const value of values)if(!object[key].some(v=>JSON.stringify(v)===JSON.stringify(value)))object[key].push(value)};
 for(const source of pack.sources||[])if(!learning.sources.some(s=>s.id===source.id))learning.sources.push(source);
 for(const [lectureId,patch] of Object.entries(pack.lectures||{})){
  const guide=teaching.guides[lectureId],lesson=learning.lessons.find(l=>l.id===lectureId);
  if(!guide||!lesson)throw Error('Unknown transcript lecture '+lectureId);
  for(const section of patch.newSections||[])if(!guide.sections.some(s=>s.id===section.id))guide.sections.push(section);
  for(const [sectionId,change] of Object.entries(patch.sections||{})){
   const section=guide.sections.find(s=>s.id===sectionId);if(!section)throw Error('Unknown transcript topic '+sectionId);
   if(change.title)section.title=change.title;
   if(change.bodyReplace)section.body=[...change.bodyReplace];
   if(change.keyPointsReplace)section.keyPoints=[...change.keyPointsReplace];
   if(change.referencesReplace)section.references=[...change.referencesReplace];
   if(change.furtherReadingReplace)section.furtherReading=[...change.furtherReadingReplace];
   append(section,'body',change.bodyAppend);append(section,'keyPoints',change.keyPointsAppend);append(section,'references',change.referencesAppend);
   append(section,'pitfalls',change.pitfallsAppend);
   for(const question of change.questions||[])if(!section.questions.some(q=>q.id===question.id))section.questions.push(question);
  }
  append(guide,'sourceNotes',patch.sourceNotes);append(guide,'fillBlanks',patch.fillBlanks);append(guide,'matching',patch.matching);
  if(patch.summaryReplace)guide.summary=[...patch.summaryReplace];
  if(patch.objectivesReplace)guide.objectives=[...patch.objectivesReplace];
  for(const source of (pack.sources||[]).filter(s=>s.lectureIds.includes(lectureId)))append(lesson,'references',[{source:source.id,page:1}]);
  lesson.scope='Slide-based teaching audited and expanded with supplied lecture transcript. Original tracker dates retained.';
 }
 for(const claim of pack.priorityClaims||[]){
  const section=teaching.guides[claim.lectureId]?.sections.find(s=>s.id===claim.sectionId);if(!section)throw Error('Unknown priority topic '+claim.sectionId);
  append(section,'examFocus',[{kind:claim.kind,label:claim.label||'Transcript emphasis',teaching:claim.teaching,evidence:claim.quote,reference:{source:claim.source,page:claim.page}}]);
 }
 const excludedSections=new Set(),excludedQuestions=new Set();
 for(const exclusion of pack.exclusions||[]){
  // affectedSections locates a scoped exclusion inside a mixed topic; it does not remove that whole topic.
  for(const id of exclusion.removeSectionIds||[])excludedSections.add(id);
  for(const id of exclusion.affectedQuestionIds||[])excludedQuestions.add(id);
 }
 for(const guide of Object.values(teaching.guides)){
  for(const section of guide.sections||[])if(excludedSections.has(section.id))for(const q of section.questions||[])excludedQuestions.add(q.id);
  guide.sections=(guide.sections||[]).filter(s=>!excludedSections.has(s.id));
  for(const section of guide.sections){section.questions=(section.questions||[]).filter(q=>!excludedQuestions.has(q.id));const curated=(checks[section.id]||[]).filter(q=>!excludedQuestions.has(q.id));
   const assigned=new Map([...curated,...section.questions].map(q=>[q.id,q]));
   checks[section.id]=[...assigned.values()];for(const q of section.questions)if(!learning.questions.some(x=>x.id===q.id))learning.questions.push(q)}
 }
 learning.questions=learning.questions.filter(q=>!excludedQuestions.has(q.id)&&!excludedSections.has(q.concept));
 for(const id of excludedSections)delete checks[id];
 for(const id of Object.keys(checks))checks[id]=checks[id].filter(q=>!excludedQuestions.has(q.id));
 Object.assign(diagrams,pack.diagrams||{});
 for(const key of pack.removeDiagramKeys||[])delete diagrams[key];
 return {excludedSections:[...excludedSections],excludedQuestions:[...excludedQuestions]};
}
