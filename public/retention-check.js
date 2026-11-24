'use strict';

function recallTimestamp(item) {
 return typeof item?.at === 'string' && Number.isFinite(Date.parse(item.at)) ? Date.parse(item.at) : null;
}

function validRecallRecords(records) {
 return (Array.isArray(records) ? records : []).filter(item =>
  typeof item?.correct === 'boolean' && recallTimestamp(item) !== null
 ).sort((a,b) => recallTimestamp(a)-recallTimestamp(b));
}

function recallRecordsFor(lesson, topic, questions, records) {
 const questionIds = new Set(questions.map(question => question.id));
 return validRecallRecords(records).filter(item =>
  typeof item.question === 'string' && item.topic === topic.id && (item.lesson === undefined ? questionIds.has(item.question) : item.lesson === lesson.id)
 );
}

function retentionState(questions, answers, retests, now = Date.now(), seen = new Set()) {
 retests = validRecallRecords(retests);
 const latest = retests.at(-1);
 const attempts = questions.map(question => answers.get(question.id)).filter(attempt => recallTimestamp(attempt) !== null);
 if (latest?.correct === true) return {label: 'Recalled later', detail: 'Fresh question answered correctly on ' + fmt(Study.localDate(latest.at)) + '.'};
 if (!attempts.some(attempt => attempt.ok === true)) return {label: 'Delayed recall', detail: 'Answer a topic question correctly to start the recall interval.'};
 const next = Math.max(recallTimestamp(latest) ?? 0, ...attempts.map(recallTimestamp)) + 86400000;
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
 if (!lesson || !topic || !Array.isArray(questions)) return '';
 const records = recallRecordsFor(lesson, topic, questions, storeOptions().retentionAttempts);
 const state = retentionForLesson(lesson, questions, records);
 const id = esc(topic.id);
 const order = state.question ? LabCore.order(state.question, 'delayed-recall-' + records.length) : [];
 const question = state.question;
 return `<section class="retention-check"><h3>${esc(state.label)}</h3>
 ${question ? `<details><summary>Try a fresh question from this objective</summary>
 <form data-retention-lesson="${esc(lesson.id)}" data-retention-topic="${id}" data-retention-question="${esc(question.id)}">
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
 if (!lesson) return;
 const {topic,questions} = inlineSelected(lesson);
 if (!topic || !Array.isArray(questions) || topic.id !== form.dataset.retentionTopic || lesson.id !== form.dataset.retentionLesson) return;
 const options = storeOptions();
 const all = options.retentionAttempts ?? [];
 if (!Array.isArray(all)) return; // Preserve unreadable saved data rather than replacing it.
 const records = recallRecordsFor(lesson, topic, questions, all);
 const {question} = retentionForLesson(lesson, questions, records);
 const value = new FormData(form).get('choice');
 if (!question || question.id !== form.dataset.retentionQuestion || typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return;
 const choice = Number(value);
 if (!Number.isSafeInteger(choice) || choice >= question.options.length || typeof question.options[choice] !== 'string') return;
 saveOptions({...options, retentionAttempts: [...all, {
  id: crypto.randomUUID(), lesson: lesson.id, topic: topic.id, question: question.id, at: new Date().toISOString(),
  correct: choice === question.answer, feedback: question.reasons?.[choice] || question.explanation
 }].slice(-600)});
 render();
});
