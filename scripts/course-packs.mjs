// Per-course startup split.
//
// The startup bundle used to carry every course's lessons, questions, guides and add-on scripts.
// This module moves each course's share into its own pack, loaded only when a student opens that
// course's content. Correctness rule: booting the core and then loading every pack must rebuild the
// exact data the old single bundle built. To keep that true:
//  - shared data scripts are split by entry (array items / object keys), and every entry keeps its
//    original position (ordinal) so merging restores the original order;
//  - a course's own add-on scripts run in their original relative order, after its data is merged;
//  - late, idempotent apply steps (lesson depth) are replayed after a pack loads.
// Anything that cannot be classified to exactly one course stays in the core.

export const PACK_COURSES = ['MOL', 'CVP'];

// Whole scripts that only touch one course (verified: no other script references their globals).
export const COURSE_SCRIPTS = {
  MOL: ['final-mock-data.js', 'mol-metabolism-data.js', 'mol-metabolism-core.js', 'mol-metabolism-runtime.js'],
  CVP: ['cvp-week2-data.js', 'cvp-week2-lessons.js', 'cvp-week2-expanded.js', 'cvp-working-set.js', 'cvp-week3-data.js',
    'cvp-week3-labels.js', 'cvp-week3-lessons.js', 'cvp-transcript-sources.js', 'cvp-transcript-anatomy.js',
    'cvp-transcript-physiology.js', 'cvp-pulmonary-anatomy-data.js', 'cvp-pulmonary-physiology-data.js',
    'cvp-pulmonary-quiz-data.js', 'cvp-pulmonary-core.js', 'cvp-pulmonary-runtime.js', 'cvp-pulmonary-transcript-data.js',
    'cvp-pulmonary-transcript-core.js', 'cvp-pulmonary-transcript-runtime.js', 'respiratory-next-data.js',
    'respiratory-next-core.js', 'respiratory-next-runtime.js'],
};

// Late step that must see a newly loaded course. Only the new course's share is replayed:
// re-running other courses' depth would undo later edits (e.g. supplemental expansions) to them.
export const REPLAY_SCRIPTS = ['lesson-depth-runtime.js'];
const DEPTH_CALL = 'applyLessonDepth(LEARNING, TEACHING, TOPIC_CHECKS, DIAGRAMS, LESSON_DEPTH);';
export function depthReplay(course, runtimeSource, entries) {
  if (!runtimeSource.includes(DEPTH_CALL)) throw Error('lesson-depth-runtime.js no longer starts with the expected applyLessonDepth call');
  const ids = path => (entries[path]?.entries || []).map(e => e.length === 3 ? e[1] : e[1].id);
  const sources = ids('LESSON_DEPTH.sources'), lessons = ids('LESSON_DEPTH.lessons'), diagrams = ids('LESSON_DEPTH.diagrams');
  const rest = runtimeSource.replace(DEPTH_CALL, '');
  const restCourses = new Set([...rest.matchAll(/\b([A-Z]{2,5})-[A-Z]?\d+/g)].map(m => m[1]).filter(c => PACK_COURSES.includes(c)));
  const call = lessons.length || sources.length || diagrams.length
    ? `(()=>{const S=new Set(${JSON.stringify(sources)}),pick=(o,k)=>Object.fromEntries(k.filter(x=>Object.hasOwn(o,x)).map(x=>[x,o[x]]));applyLessonDepth(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,{sources:LESSON_DEPTH.sources.filter(s=>S.has(s.id)),lessons:pick(LESSON_DEPTH.lessons,${JSON.stringify(lessons)}),diagrams:pick(LESSON_DEPTH.diagrams,${JSON.stringify(diagrams)})})})();`
    : '';
  // The rest of the runtime edits specific lectures by id; it runs with the course it names.
  return call + (restCourses.has(course) ? '\n;\n' + rest : '\n;\ntry{inlineLessonCache.clear()}catch{}');
}

// Shared data scripts split per entry. Each must be exactly `const NAME = <JSON literal>;`.
export const SPLIT_DATA = {
  'learning-data.js': {name: 'LEARNING', arrays: ['sources', 'lessons', 'questions']},
  'teaching-data.js': {name: 'TEACHING', objects: ['guides']},
  'topic-checks.js': {name: 'TOPIC_CHECKS', root: true},
  'original-data.js': {name: 'ORIGINAL_EXAMS', arrays: ['sources', 'questions', 'sets']},
  'lesson-depth-data.js': {name: 'LESSON_DEPTH', arrays: ['sources'], objects: ['lessons', 'diagrams']},
};

export const lectureCourse = id => {
  const course = /^([A-Z]{2,5})-[A-Z]?\d/.exec(String(id || ''))?.[1];
  return PACK_COURSES.includes(course) ? course : null;
};
const prefixCourse = id => {
  const m = /^(mol|cvp)[-_]/i.exec(String(id || ''));
  return m ? m[1].toUpperCase() : null;
};
const single = set => {
  const list = [...set].filter(Boolean);
  if (!list.length) return undefined; // unknown
  return new Set(list).size === 1 && !list.includes('core') ? list[0] : null; // null = shared → core
};
const coursesOf = ids => new Set((ids || []).map(id => lectureCourse(id) || 'core'));

export function parseLiteral(file, source, name) {
  const match = new RegExp('^\\s*(?:/\\*[\\s\\S]*?\\*/\\s*)?(?:\'use strict\';\\s*)?const\\s+' + name + '\\s*=\\s*').exec(source);
  if (!match) throw Error(`${file} must start with "const ${name} =" to be split by course`);
  const body = source.slice(match[0].length).replace(/;\s*$/, '');
  try { return JSON.parse(body); } catch { throw Error(`${file} must be a pure JSON literal to be split by course`); }
}

// Assign every entry of every split global to a course (or null = core).
export function classify(data) {
  const L = data.LEARNING, O = data.ORIGINAL_EXAMS, D = data.LESSON_DEPTH;
  const out = {};
  const put = (path, list) => { out[path] = list; };

  if (L) {
    const lessons = L.lessons.map(l => lectureCourse(l.id));
    const questions = L.questions.map(q => single(coursesOf(q.lectureIds)) ?? null);
    // Sources: by the courses that reference them; unreferenced fall back to id prefix / lectureIds.
    const refs = new Map();
    const note = (source, course) => { if (source) (refs.get(source) ?? refs.set(source, new Set()).get(source)).add(course || 'core'); };
    const walkRefs = (value, course) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { for (const v of value) walkRefs(v, course); return; }
      if (typeof value.source === 'string') note(value.source, course);
      for (const v of Object.values(value)) if (v && typeof v === 'object') walkRefs(v, course);
    };
    L.lessons.forEach((l, i) => walkRefs(l, lessons[i]));
    L.questions.forEach((q, i) => walkRefs(q, questions[i]));
    if (data.TEACHING) for (const [id, guide] of Object.entries(data.TEACHING.guides)) walkRefs(guide, lectureCourse(id));
    if (data.TOPIC_CHECKS) for (const [key, list] of Object.entries(data.TOPIC_CHECKS)) walkRefs(list, lectureCourse(key.split(':')[0]));
    const sources = L.sources.map(s => {
      const byRef = refs.has(s.id) ? single(refs.get(s.id)) : undefined;
      if (byRef !== undefined) return byRef;
      const byLecture = s.lectureIds ? single(coursesOf(s.lectureIds)) : undefined;
      return byLecture !== undefined ? byLecture : prefixCourse(s.id);
    });
    put('LEARNING.lessons', lessons); put('LEARNING.questions', questions); put('LEARNING.sources', sources);
  }
  if (data.TEACHING) put('TEACHING.guides', Object.keys(data.TEACHING.guides).map(lectureCourse));
  if (data.TOPIC_CHECKS) put('TOPIC_CHECKS', Object.keys(data.TOPIC_CHECKS).map(k => lectureCourse(k.split(':')[0])));
  if (O) {
    const sourceCourse = new Map(O.sources.map(s => [s.id, prefixCourse(s.id)]));
    const questions = O.questions.map(q => {
      const byLecture = q.lectureIds?.length ? single(coursesOf(q.lectureIds)) : undefined;
      return byLecture !== undefined ? byLecture : (sourceCourse.get(q.source) ?? prefixCourse(q.source));
    });
    const qCourse = new Map(O.questions.map((q, i) => [q.id, questions[i]]));
    const sets = O.sets.map(s => {
      const c = single(new Set((s.ids || []).map(id => qCourse.get(id) || 'core')));
      return c === undefined ? prefixCourse(s.id) : c;
    });
    // A source stays with its questions' course; shared → core.
    const used = new Map();
    O.questions.forEach((q, i) => (used.get(q.source) ?? used.set(q.source, new Set()).get(q.source)).add(questions[i] || 'core'));
    const sources = O.sources.map(s => used.has(s.id) ? (single(used.get(s.id)) ?? null) : prefixCourse(s.id));
    put('ORIGINAL_EXAMS.sources', sources); put('ORIGINAL_EXAMS.questions', questions); put('ORIGINAL_EXAMS.sets', sets);
  }
  if (D) {
    const lessonKeys = Object.keys(D.lessons).map(lectureCourse);
    const sources = D.sources.map(s => single(coursesOf(s.lectureIds)) ?? null);
    const sourceCourse = new Map(D.sources.map((s, i) => [s.id, sources[i]]));
    const diagrams = Object.keys(D.diagrams).map(k => sourceCourse.get(k.split(':')[0]) ?? null);
    put('LESSON_DEPTH.sources', sources); put('LESSON_DEPTH.lessons', lessonKeys); put('LESSON_DEPTH.diagrams', diagrams);
  }
  return out;
}

// Every source/lecture reference from a course entry must resolve inside the core or the same course.
export function checkReferences(data, classes) {
  const problems = [];
  if (data.LEARNING) {
    const where = new Map(data.LEARNING.sources.map((s, i) => [s.id, classes['LEARNING.sources'][i]]));
    if (data.LESSON_DEPTH) data.LESSON_DEPTH.sources.forEach((s, i) => where.set(s.id, classes['LESSON_DEPTH.sources'][i]));
    const scan = (value, course, label) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { for (const v of value) scan(v, course, label); return; }
      if (typeof value.source === 'string' && where.has(value.source)) {
        const target = where.get(value.source);
        if (target && target !== course) problems.push(`${label} (${course || 'core'}) references ${value.source} (${target})`);
      }
      for (const v of Object.values(value)) if (v && typeof v === 'object') scan(v, course, label);
    };
    data.LEARNING.lessons.forEach((l, i) => scan(l, classes['LEARNING.lessons'][i], 'lesson ' + l.id));
    data.LEARNING.questions.forEach((q, i) => scan(q, classes['LEARNING.questions'][i], 'question ' + q.id));
    if (data.TEACHING) Object.entries(data.TEACHING.guides).forEach(([id, g], i) => scan(g, classes['TEACHING.guides'][i], 'guide ' + id));
  }
  if (data.LESSON_DEPTH) Object.entries(data.LESSON_DEPTH.lessons).forEach(([id], i) => {
    const course = classes['LESSON_DEPTH.lessons'][i];
    if (course !== lectureCourse(id)) problems.push(`lesson depth ${id} is not in its own course`);
  });
  return problems;
}

const valueAt = (data, path) => path.split('.').reduce((v, k) => v?.[k], data);

// Build the core JSON for each split global plus each course's entries with their ordinals.
export function splitData(data) {
  const classes = classify(data);
  const problems = checkReferences(data, classes);
  if (problems.length) throw Error('Course split would break references:\n' + problems.slice(0, 20).join('\n'));
  const core = structuredClone(data), packs = Object.fromEntries(PACK_COURSES.map(c => [c, {}])), order = {};
  for (const [path, list] of Object.entries(classes)) {
    const original = valueAt(data, path), target = valueAt(core, path);
    if (Array.isArray(original)) {
      if (original.some(x => !x || typeof x !== 'object')) throw Error(path + ' must hold objects to keep order');
      const keep = [], keepOrd = [];
      original.forEach((item, ord) => {
        const course = list[ord];
        if (course && packs[course]) (packs[course][path] ??= {kind: 'array', entries: []}).entries.push([ord, item]);
        else { keep.push(item); keepOrd.push(ord); }
      });
      target.splice(0, target.length, ...keep);
      order[path] = keepOrd;
    } else {
      const keepOrd = [];
      Object.keys(original).forEach((key, ord) => {
        const course = list[ord];
        if (course && packs[course]) { (packs[course][path] ??= {kind: 'object', entries: []}).entries.push([ord, key, original[key]]); delete target[key]; }
        else keepOrd.push(ord);
      });
      order[path] = keepOrd;
    }
  }
  return {core, packs, order, classes};
}

// Core replacement source for one split data script.
export function coreDataSource(name, value, order) {
  const regs = Object.entries(order).filter(([path]) => path.split('.')[0] === name)
    .map(([path, ords]) => `__reviewOrder(${JSON.stringify(path)},${path},${JSON.stringify(ords)});`);
  return `const ${name}=${JSON.stringify(value)};${regs.join('')}`;
}

// Runs first in the core bundle: the order registry and the pack manifest.
export function preludeSource(manifest) {
  return `const __REVIEW_ORDER=new Map();function __reviewOrder(path,target,ords){if(Array.isArray(target)){const m=new WeakMap();target.forEach((x,i)=>m.set(x,ords[i]));__REVIEW_ORDER.set(path,m)}else{const keys=Object.keys(target),m=new Map(keys.map((k,i)=>[k,ords[i]]));__REVIEW_ORDER.set(path,m)}}globalThis.REVIEW_COURSE_PACKS=${JSON.stringify(manifest)};`;
}

// Data merge + the course's own scripts + replays, ending with the ready signal.
export function packSource(course, entries, scriptSources, replaySources) {
  const merges = Object.entries(entries).map(([path, {kind, entries: list}]) =>
    `__reviewMerge${kind === 'array' ? 'Array' : 'Keys'}(${JSON.stringify(path)},${path},${JSON.stringify(list)});`).join('\n');
  return [merges, ...scriptSources, ...replaySources, `__reviewCourseReady(${JSON.stringify(course)});`].join('\n;\n');
}

// names[i] is the startup script name, sources[i] its (already transformed) source.
// Returns the core script list (order preserved) and one source per course pack.
export function splitCourseScripts(names, sources) {
  const index = new Map(names.map((n, i) => [n, i]));
  // Pages without the loader (test fixtures, other entry points) bundle as before.
  if (!index.has('course-packs.js')) return {coreSources: sources, packSources: {}};
  const missing = [...Object.values(COURSE_SCRIPTS).flat(), ...REPLAY_SCRIPTS, ...Object.keys(SPLIT_DATA)].filter(n => !index.has(n));
  if (missing.length) throw Error('Course split expects these startup scripts: ' + missing.join(', '));
  const data = {};
  for (const [file, {name}] of Object.entries(SPLIT_DATA)) data[name] = parseLiteral(file, sources[index.get(file)], name);
  const {core, packs, order} = splitData(data);
  const owned = new Map(Object.entries(COURSE_SCRIPTS).flatMap(([c, list]) => list.map(n => [n, c])));
  const coreSources = [];
  names.forEach((name, i) => {
    if (owned.has(name)) return;
    if (SPLIT_DATA[name]) { const n = SPLIT_DATA[name].name; coreSources.push(coreDataSource(n, core[n], order)); return; }
    coreSources.push(sources[i]);
  });
  const depthRuntime = sources[index.get('lesson-depth-runtime.js')];
  const packSources = Object.fromEntries(PACK_COURSES.map(course => [course, packSource(course, packs[course],
    names.filter(n => owned.get(n) === course).map(n => sources[index.get(n)]), [depthReplay(course, depthRuntime, packs[course])])]));
  return {coreSources, packSources};
}
