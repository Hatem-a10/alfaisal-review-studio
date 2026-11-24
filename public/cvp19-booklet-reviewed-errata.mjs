// Reviewed editorial corrections to the source booklet. Printed keys and past attempt snapshots remain untouched.
// This overlay is intentionally explicit: never guess a correction from a question's wording alone.
const originalRevision = '19-corrected-2026-11-12';
export const reviewedRevision = originalRevision + '-editorial-2026-11-24';

export const reviewedBookletErrata = {
  'cvp19-mcq-3': {
    expectedOptions: ['K+', 'Na+', 'Cl￾D) Ca2+'],
    options: ['K+', 'Na+', 'Cl⁻', 'Ca²⁺'],
    letters: ['A', 'B', 'C', 'D'],
    answer: 0,
    acceptedAnswers: [0],
    explanation: 'A — K⁺. Inward-rectifier K⁺ channels dominate ventricular resting permeability. Na⁺, Cl⁻ and Ca²⁺ do not.',
    reasons: [
      'Correct: resting ventricular myocytes are most permeable to K⁺.',
      'Na⁺ is chiefly important for the rapid phase-0 upstroke.',
      'Cl⁻ is not the dominant resting membrane conductance.',
      'Ca²⁺ contributes chiefly to the phase-2 plateau.',
    ],
    sourceIssue: 'Two printed answer choices were joined by extraction; C and D are restored separately.',
  },
  'cvp19-mcq-19': {
    expectedOptions: ['92', '40', '60', '70'],
    answer: null,
    acceptedAnswers: [1, 2],
    explanation: 'B or C — Complete AV block has no single fixed rate. A ventricular escape may be about 20–40 bpm; a junctional escape may be about 40–60 bpm.',
    reasons: [
      '92 bpm is above the usual untreated escape ranges.',
      '40 bpm can occur with a ventricular or junctional escape.',
      '60 bpm can occur at the upper end of a junctional escape.',
      '70 bpm is above the usual untreated escape ranges.',
    ],
    sourceIssue: 'The printed B key is not uniquely determined without the ECG or escape focus; self-check, not single-answer grading.',
  },
  'cvp19-mcq-213': {
    expectedOptions: [
      'Central venous pressure increased; mean arterial pressure decreased; venous return increased',
      'Central venous pressure increased; mean arterial pressure decreased; venous return decreased',
      'Central venous pressure decreased; mean arterial pressure increased; venous return decreased',
      'Central venous pressure decreased; mean arterial pressure increased; venous return increased',
      'Central venous pressure decreased; mean arterial pressure decreased; venous return decreased',
    ],
    answer: 4,
    acceptedAnswers: [4],
    explanation: 'E — Immediately on standing, venous pooling lowers central venous pressure and venous return, reducing cardiac output and arterial pressure before reflex compensation.',
    reasons: [
      'Venous return and central venous pressure initially fall, not rise.',
      'Central venous pressure initially decreases rather than increases.',
      'Before baroreflex compensation, mean arterial pressure falls, not rises.',
      'Both mean arterial pressure and venous return move in the opposite direction.',
      'Correct: gravitational venous pooling initially reduces all three values.',
    ],
    sourceIssue: 'The previous explanation incorrectly said the visible choices were missing; the five choices are present in this edition.',
  },
  'cvp19-mcq-236': {
    expectedOptions: [
      'Impulse ↑, Cardiac output ↓, Resistance ↓',
      'Impulse ↓, CO ↓, Resistance ↓',
      'Impulse ↑, CO ↑, Resistance ↓',
      'Impulse ↑, CO ↓, Resistance ↑E)Impulse ↓, CO ↓, Resistance ↑',
    ],
    options: [
      'Impulse ↑, Cardiac output ↓, Resistance ↓',
      'Impulse ↓, CO ↓, Resistance ↓',
      'Impulse ↑, CO ↑, Resistance ↓',
      'Impulse ↑, CO ↓, Resistance ↑',
      'Impulse ↓, CO ↓, Resistance ↑',
    ],
    letters: ['A', 'B', 'C', 'D', 'E'],
    answer: 0,
    acceptedAnswers: [0],
    explanation: 'A — Restoring carotid sinus stretch increases baroreceptor firing. Less sympathetic drive then lowers cardiac output and peripheral resistance.',
    reasons: [
      'Correct: baroreceptor impulses rise as CO and resistance fall.',
      'Carotid sinus impulses rise rather than fall.',
      'The reflex tends to reduce, not increase, cardiac output.',
      'Peripheral resistance falls rather than rises.',
      'Both baroreceptor firing and resistance are reversed.',
    ],
    sourceIssue: 'The extracted D and E alternatives were merged; they are restored as separate choices.',
  },
  'cvp19-mcq-328': {
    expectedOptions: ['At FRC', 'At RV', 'At 60% of TLC', 'Below RV'],
    answer: null,
    acceptedAnswers: [0, 2],
    explanation: 'A or C — Lung compliance is greatest across the steeper middle portion of its pressure–volume curve, near normal operating volumes. FRC and 60% TLC are plausible without a specified curve; printed D is incorrect.',
    reasons: [
      'FRC is near the high-compliance operating range.',
      'Compliance is reduced at very low volumes near RV.',
      '60% TLC is another plausible mid-volume, high-compliance point.',
      'Below RV is not a normal physiological lung volume.',
    ],
    sourceIssue: 'Printed D is physiologically incorrect. A and C are not uniquely distinguishable without the source curve; self-check only.',
  },
  'cvp19-mcq-362': {
    expectedOptions: [
      'Tidal volume 40; respiratory frequency 5',
      'Tidal volume 10; respiratory frequency 20',
      'Tidal volume 5; respiratory frequency 10',
      'Tidal volume 10; respiratory frequency 30',
    ],
    answer: null,
    acceptedAnswers: [0, 3],
    explanation: 'A or D depends on dead space: alveolar ventilation = (tidal volume − dead-space volume) × frequency. A is greater if dead space exceeds 4 volume units; D is greater if it is below 4. The stem gives no dead space.',
    reasons: [
      'May be greatest if dead space is above 4 volume units.',
      'With the same tidal volume as D but a slower rate, B is lower.',
      'C has substantially less minute ventilation than A or D.',
      'May be greatest if dead space is below 4 volume units.',
    ],
    sourceIssue: 'Missing dead-space volume makes the printed A key non-unique; self-check only.',
  },
};

export function applyReviewedBookletErrata(pack) {
  if (!pack || pack.version !== 1 || pack.revision !== originalRevision || !Array.isArray(pack.questions)) {
    throw new Error('Unexpected booklet revision; review corrections against the new source before applying.');
  }
  const seen = new Set();
  const questions = pack.questions.map(question => {
    const erratum = reviewedBookletErrata[question.id];
    if (!erratum) return {...question, bookletRevision: reviewedRevision};
    if (seen.has(question.id) || JSON.stringify(question.options) !== JSON.stringify(erratum.expectedOptions)) {
      throw new Error('Booklet source changed for ' + question.id + '; recheck choices before applying corrections.');
    }
    seen.add(question.id);
    const {expectedOptions, ...changes} = erratum;
    const updated = {...question, ...changes, bookletRevision: reviewedRevision};
    if (updated.reasons.length !== updated.options.length ||
        updated.reasons.some(reason => typeof reason !== 'string' || !reason.trim()) ||
        updated.acceptedAnswers.some(index => !Number.isInteger(index) || index < 0 || index >= updated.options.length) ||
        (updated.acceptedAnswers.length > 1 ? updated.answer !== null : updated.answer !== updated.acceptedAnswers[0])) {
      throw new Error('Invalid reviewed grading and option rationale for ' + question.id);
    }
    return updated;
  });
  if (seen.size !== Object.keys(reviewedBookletErrata).length) throw new Error('A reviewed booklet ID is missing.');
  return {...pack, revision: reviewedRevision, questions};
}
