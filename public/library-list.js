'use strict';

function libraryDocumentURL(source, page = 1) {
 if (!source) return null;
 const target = sourceTarget({source: source.id, page});
 if (!target || !/^(?:\/api\/(?:materials|study-assets)\/[\w-]+(?:[?#]|$)|\/(?:api\/site-assets\/)?(?:materials|study_material)\/|https:\/\/)/.test(target.url)) return null;
 if (!/\.(?:pdf|pptx?)(?:$|[?#])/i.test(target.url) && !/\.(?:pdf|pptx?)(?:$|[?#])/i.test(source.name)) return null;
 return sourcePageURL(target);
}

function suppliedLectureForFile(name) {
 const file = name.replace(/ \(\d+\)(?=\.[^.]+$)/, '');
 return {
  'Thoracic Wall - Dr. Olena.pdf': 'CVP-A8',
  'Lecture 2 Blood Vessel Histology 2026 Fall Dr Ani.pptx': 'CVP-A7',
  'A7. Blood Vessel Histology Transcription.pdf': 'CVP-A7',
  'Heart valves and heart sounds - Dr Moni Nader-15102026.pptx': 'CVP-P10',
  'Hemodynamics II- Vascular distensibility and function of blood - Dr. Nader.pptx': 'CVP-P9',
  'Hemodynamics I - Overview of the circulation Dr Moni Nader.pptx': 'CVP-P8',
  'Cardiac Cycle- Dr Moni Nader.pptx': 'CVP-P6',
  "Mediastinum - Dr Olena.pdf": "CVP-A11",
  "Lecture 3 Microcirculation Histology 2026 Fall Dr Ani.pptx": "CVP-A10",
  "ANATOMY OF THE NOSE, LARYNX AND TRACHEA.pptx": "CVP-A12",
  "Histology of respiratory tract 1_Dr. Einas-compressed.pdf": "CVP-A13",
  "A10. Lecture 3 Microcirculation Histology 2026 Fall Dr Ani.pdf": "CVP-A10",
  "A11 Mediastinum transcription.pdf": "CVP-A11",
  "A12. Anatomy of the Nose, Larynx, & Trachea Transcription - Haadiya Zeeshan.pdf": "CVP-A12",
  "A13_Histology_of_the_Upper_Respiratory_Tract_Transcription.pdf": "CVP-A13",
  "Embryology of Heart 2-aortic arch.pptx": "CVP-A14",
  "Intercostal Space, Diaphragm - Dr. Olena.pdf": "CVP-A15",
  "Lungs Anatomy - Dr. Olena.pdf": "CVP-A16",
  "Histology of respiratory tract 2_Dr. Einas-compressed.pdf": "CVP-A17",
  "A14. Aortic Arch Transcription by Wasan Binsadiq.pdf": "CVP-A14",
  "A15. Intercostal Space, Diaphragm - Dr. Olena - by Merehan Soliman.pdf": "CVP-A15",
  "A16 Lungs Anatomy Transcription - Haadiya Zeeshan.pdf": "CVP-A16",
  "A17_Histology of the Lower Respiratory Tract_Transcription (1)-1.pdf": "CVP-A17",
 }[file];
}

function libraryMaterials(item, lesson, sources) {
 const refs = lesson?.references || [];
 const coverage = lesson?.coverage;
 const selections = {slides: [], transcript: []};
 for (const source of sources) {
  const id = source.id;
  if (/not verified lecturer transcript/i.test(source.kind || '')) continue;
  const category = /transcri|\btranscript\b/i.test(source.kind || '') || /^cvp-t-|^cvp-transcript$/.test(id) ? 'transcript'
   : /slide|supplied lecture$/i.test(source.kind || '') && !/notes|quiz|syllabus/i.test(source.kind || '') || /^cvp-w3-/.test(id) ? 'slides'
   : source.lectureId === item.id ? (/transcri|transcript|^A7\. Blood Vessel Histology\.pdf$|^P10\. Heart sounds\.pdf$|^A10\. Lecture 3 Microcirculation Histology|^A15\. Intercostal Space, Diaphragm - Dr\. Olena - by Merehan Soliman/i.test(source.name) ? 'transcript' : /slides|presentation|\.pptx?$/i.test(source.name) || suppliedLectureForFile(source.name) === item.id ? 'slides' : null) : null;
  if (!category || (source.lectureIds?.length && !source.lectureIds.includes(item.id))) continue;
  const reference = refs.find(ref => ref.source === id);
  const range = Array.isArray(source.lectureRanges) && source.lectureRanges.find(entry => entry.lectureId === item.id);
  const matchingCoverage = category === 'slides' ? coverage?.slideSources?.some(entry => entry.source === id) : coverage?.transcriptSource === id;
  if (!reference && !range && !matchingCoverage && !source.lectureIds?.includes(item.id) && source.lectureId !== item.id) continue;
  const sharedStart = {
   'new-embryology:CVP-A20': 26,
   'depth-t-5:CVP-P19': 19,
   'new-p2324:CVP-P24': 17,
   'cvp-pulm-t-p20:CVP-P21': 20,
  }[id + ':' + item.id];
  selections[category].push({source, page: sharedStart || range?.start || (id.startsWith('depth-t-') ? 1 : reference?.page) || 1,
   rank: Number(id === 'depth-t-6' && item.id === 'CVP-P18') * 6 + Number(!!matchingCoverage) * 4 + Number(!!source.lectureIds?.includes(item.id)) * 2 + Number(!!source.url && source.url !== '#library')});
 }
 for (const list of Object.values(selections)) list.sort((a,b) => b.rank - a.rank);
 return selections;
}

function libraryLectureLists() {
 const sources = LEARNING.sources.concat(uploads).filter(source => libraryDocumentURL(source));
 const covered = new Set();
 const groups = [['CVP-A','CVP Anatomy'], ['CVP-P','CVP Physiology'], ['MOL-','Molecular Medicine']];
 const lists = groups.map(([prefix,label]) => {
  const rows = DATA.items.filter(item => item.id.startsWith(prefix)).sort((a,b) => Number(a.id.slice(prefix.length)) - Number(b.id.slice(prefix.length)));
  return `<section class="material-list"><h2>${label}</h2><ol>${rows.map(item => {
   const selections = libraryMaterials(item, lessonById(item.id), sources);
   const actions = (list, label) => {
    if (!list.length) return `<button disabled title="${label} unavailable">${label} unavailable</button>`;
    const button = ({source,page}, caption) => {
     covered.add(source.id);
     const url = libraryDocumentURL(source, page);
     return url ? `<a class="material-action" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(source.name)}">${esc(caption)} ↗</a>`
      : '';
    };
    return button(list[0], label) + (list.length > 1 ? `<details class="material-alternates"><summary>More ${label.toLowerCase()} (${list.length - 1})</summary>${list.slice(1).map(entry => button(entry, entry.source.displayName || entry.source.name)).join('')}</details>` : '');
   };
   return `<li><div><small>${esc(item.id.replace('-', ' '))}</small><strong>${esc(title(item))}</strong></div><div class="material-actions"><div>${actions(selections.slides,'Slides')}</div><div>${actions(selections.transcript,'Transcription')}</div></div></li>`;
  }).join('')}</ol></section>`;
 }).join('');
 return lists + `<details class="material-extras"><summary>Other sources and uploads</summary><ul>${sources.filter(source => !covered.has(source.id)).map(source => `<li><a href="${esc(libraryDocumentURL(source))}" target="_blank" rel="noopener noreferrer">${esc(source.displayName || source.name)} ↗</a></li>`).join('')}</ul></details>`;
}
