'use strict';
function applyRespiratoryNext(learning,teaching,checks,diagrams,pack){
 for(const s of pack.sources)if(!learning.sources.some(v=>v.id===s.id))learning.sources.push(s);
 for(const[id,change]of Object.entries(pack.lectures)){
  const lesson=learning.lessons.find(l=>l.id===id);if(!lesson)throw Error('Missing respiratory lecture '+id);const guide=teaching.guides[id]??={overview:'Teaching and applied questions from your supplied respiratory lecture.',objectives:change.sections.map(s=>s.title),sections:[],summary:change.sections.flatMap(s=>s.keyPoints),fillBlanks:[],matching:[]};
  for(const section of change.sections){if(!guide.sections.some(s=>s.id===section.id))guide.sections.push(section);checks[section.id]=section.questions;for(const q of section.questions)if(!learning.questions.some(v=>v.id===q.id))learning.questions.push(q)}
  lesson.references??=[];if(!lesson.references.some(r=>r.source===change.source))lesson.references.unshift({source:change.source,page:1});
  guide.sourceNotes??=[];const note='Expanded with the newly supplied respiratory lecture. Original topics, questions and earned records retained. Source inconsistencies are identified in the relevant teaching.';if(!guide.sourceNotes.includes(note))guide.sourceNotes.push(note);
 }
 Object.assign(diagrams,pack.diagrams);
}
