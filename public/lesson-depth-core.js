'use strict';

function applyLessonDepth(learning, teaching, checks, diagrams, pack) {
  const existingSources = new Set(learning.sources.map(source => source.id));
  for (const source of pack.sources) {
    if (!existingSources.has(source.id)) learning.sources.push(source);
  }

  const questionIds = new Set(learning.questions.map(question => question.id));
  for (const [lectureId, patch] of Object.entries(pack.lessons)) {
    const lesson = learning.lessons.find(item => item.id === lectureId);
    if (!lesson) throw new Error('Unknown lecture ' + lectureId);
    const firstGuide = !teaching.guides[lectureId];
    const guide = teaching.guides[lectureId] ??= {
      overview: patch.note + ' ' + patch.overview,
      objectives: patch.sections.map(section => section.title),
      sections: lesson.facts.map(fact => ({
        id: fact.id,
        concept: fact.id,
        title: fact.concept,
        body: [fact.answer, fact.teach].filter(Boolean),
        references: fact.references || lesson.references,
      })),
      summary: [],
      fillBlanks: [],
      matching: [],
    };
    guide.sourceNotes ??= [];
    if (patch.note && !guide.sourceNotes.includes(patch.note)) guide.sourceNotes.push(patch.note);
    for (const addition of patch.sections) {
      let section = guide.sections.find(item => item.id === addition.id);
      if (!section) {
        section = {id: addition.id, title: addition.title, body: [], references: []};
        guide.sections.push(section);
      }
      for (const paragraph of addition.body) {
        if (!section.body.includes(paragraph)) section.body.push(paragraph);
      }
      section.references ??= [];
      for (const ref of addition.references) {
        if (!section.references.some(existing => existing.source === ref.source && existing.page === ref.page)) {
          section.references.push(ref);
        }
      }
      for (const question of addition.questions) {
        if (questionIds.has(question.id)) continue;
        questionIds.add(question.id);
        learning.questions.push(question);
        (section.questions ??= []).push(question);
        const explicit = checks[section.id] ??= [];
        if (explicit !== section.questions) explicit.push(question);
      }
    }
    if (firstGuide) {
      const authored = new Set(patch.sections.map(section => section.id));
      guide.sections.sort((left, right) => Number(authored.has(right.id)) - Number(authored.has(left.id)));
    }
    lesson.references ??= [];
    for (const ref of patch.sourceLinks) {
      if (!lesson.references.some(existing => existing.source === ref.source)) lesson.references.push(ref);
    }
  }

  for (const [key, figures] of Object.entries(pack.diagrams)) {
    const current = diagrams[key] ??= [];
    for (const figure of figures) {
      if (!current.some(item => item.image === figure.image)) current.push(figure);
    }
  }
}
