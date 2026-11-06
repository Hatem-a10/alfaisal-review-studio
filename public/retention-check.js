'use strict';

function retentionState(questions, answers, retests, now = Date.now(), seen = new Set()) {
 const latest = retests.at(-1);
 const attempts = questions.map(question => answers.get(question.id)).filter(Boolean);
 if (latest?.correct) return {label: 'Recalled later', detail: 'Fresh question answered correctly on ' + fmt(Study.localDate(latest.at)) + '.'};
 if (!attempts.some(attempt => attempt.ok)) return {label: 'Delayed recall', detail: 'Answer a topic question correctly to start the recall interval.'};
 const next = Math.max(Date.parse(latest?.at) || 0, ...attempts.map(attempt => Date.parse(attempt.at) || 0)) + 86400000;
 if (now < next) return {label: latest ? 'Retest pending' : 'Practiced recently', detail: 'A delayed check unlocks 24 hours after your latest practice on this topic.'};
 const used = new Set(retests.map(attempt => attempt.question));
 const question = questions.find(item => !item.duplicateOf && !answers.has(item.id) && !used.has(item.id) && !seen.has(item.id));
 return question ? {label:'Delayed recall ready', question} : {label:'Delayed recall', detail:'This topic has no unused mapped question for a fresh check yet.'};
}

function retentionForLesson(lesson, questions, records) {
 const history = state[lesson.id]?.learning;
 const seen = new Set([...Object.keys(history?.results || {}), ...(history?.attempts || []).map(item => item.q)]);
 return retentionState(questions, inlineLatest(lesson), records, Date.now(), seen);
}

function retentionPanel(lesson, topic, questions) {
 const records = (storeOptions().retentionAttempts || []).filter(item => item.topic === topic.id).sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
 const state = retentionForLesson(lesson, questions, records);
 const id = esc(topic.id);
 const order = state.question ? LabCore.order(state.question, 'delayed-recall-' + records.length) : [];
 const question = state.question;
 return `<section class="retention-check"><h3>${esc(state.label)}</h3>
 ${question ? `<details><summary>Try a fresh question from this objective</summary>
 <form data-retention-topic="${id}" data-retention-question="${esc(question.id)}">
 <p>${esc(question.question)}</p>${question.image ? `<img src="${esc(question.image)}" alt="${esc(question.imageAlt || 'Question figure')}">` : ''}
 ${order.map(i => `<label><input type="radio" name="choice" value="${i}" required> ${esc(question.options[i])}</label>`).join('')}
 <button type="submit">Check delayed recall</button></form></details>` : `<p>${esc(state.detail)}</p>`}
 ${records.at(-1) ? `<details><summary>Latest recall feedback</summary><p>${esc(records.at(-1).feedback)}</p></details>` : ''}
 <small>Recall evidence is separate from your topic MCQ score.</small></section>`;
}

document.addEventListener('submit', event => {
 const form = event.target.closest('[data-retention-topic]');
 if (!form) return;
 event.preventDefault();
 const lesson = lessonById(lessonId);
 const {topic,questions} = inlineSelected(lesson);
 if (topic.id !== form.dataset.retentionTopic) return;
 const options = storeOptions();
 const all = options.retentionAttempts || [];
 const records = all.filter(item => item.topic === topic.id).sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
 const {question} = retentionForLesson(lesson, questions, records);
 const value = new FormData(form).get('choice');
 if (!question || question.id !== form.dataset.retentionQuestion || value === null || !question.options[Number(value)]) return;
 const choice = Number(value);
 saveOptions({...options, retentionAttempts: [...all, {
  id: crypto.randomUUID(), topic: topic.id, question: question.id, at: new Date().toISOString(),
  correct: choice === question.answer, feedback: question.reasons?.[choice] || question.explanation
 }].slice(-600)});
 render();
});
