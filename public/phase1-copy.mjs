/* Exact-copy decluttering only. Never infer that generic muted/subtitle text is redundant. */
const redundantWelcomeCopy = new Map([
  ['0', 'Set up your study space in a few steps.'],
  ['2', 'Choose your accent and appearance.'],
]);

const redundantIntroCopy = new Set([
 'Explain the mechanism, answer without hints, then use each mistake to choose the next question.',
 'Open complete slides and transcriptions, or add original files to a lecture.',
 'Import a package and study its cards, pictures and audio here.',
]);
export function declutter(container) {
  if (!container?.querySelectorAll) return 0;
  let removed = 0;
  // A5-035: collect both independent DOM queries before mutating either list.
  const welcome = container.querySelectorAll('.student-welcome [data-step] > p');
  const intro = container.querySelectorAll('.intro > div > p');
  for (const paragraph of welcome) {
    const step = paragraph.parentElement?.getAttribute('data-step');
    if (redundantWelcomeCopy.get(step) !== paragraph.textContent?.trim()) continue;
    paragraph.remove();
    removed++;
  }
  for (const paragraph of intro) {
    if (redundantIntroCopy.has(paragraph.textContent?.trim())) { paragraph.remove(); removed++; }
  }
  return removed;
}
