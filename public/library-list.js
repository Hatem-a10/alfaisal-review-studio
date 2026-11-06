'use strict';

function libraryMaterials(item, lesson, sources) {
 const refs = lesson?.references || [];
 const coverage = lesson?.coverage;
 const selections = {slides: [], transcript: []};
 for (const source of sources) {
  const id = source.id;
  if (/not verified lecturer transcript/i.test(source.kind || '')) continue;
  const category = /transcri|\btranscript\b/i.test(source.kind || '') || /^cvp-t-|^cvp-transcript$/.test(id) ? 'transcript'
   : /slide|supplied lecture$/i.test(source.kind || '') && !/notes|quiz|syllabus/i.test(source.kind || '') || /^cvp-w3-/.test(id) ? 'slides'
   : source.lectureId === item.id ? (/transcri|transcript/i.test(source.name) ? 'transcript' : /slides|presentation|\.pptx?$/i.test(source.name) ? 'slides' : null) : null;
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
 const sources = LEARNING.sources.concat(uploads);
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
     const target = sourceTarget({source: source.id,page});
     const url = target && sourcePageURL(target);
     return url ? `<a class="material-action" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(source.name)}">${esc(caption)} ↗</a>`
      : `<button data-open-page="${esc(source.id)}" data-page="${page}" title="${esc(source.name)}">${esc(caption)}${source.url==='#library'?' (text)':''} →</button>`;
    };
    return button(list[0], label) + (list.length > 1 ? `<details class="material-alternates"><summary>More ${label.toLowerCase()} (${list.length - 1})</summary>${list.slice(1).map(entry => button(entry, entry.source.displayName || entry.source.name)).join('')}</details>` : '');
   };
   return `<li><div><small>${esc(item.id.replace('-', ' '))}</small><strong>${esc(title(item))}</strong></div><div class="material-actions"><div>${actions(selections.slides,'Slides')}</div><div>${actions(selections.transcript,'Transcription')}</div></div></li>`;
  }).join('')}</ol></section>`;
 }).join('');
 return lists + `<details class="material-extras"><summary>Other sources and uploads</summary><ul>${sources.filter(source => !covered.has(source.id)).map(source => `<li><button data-document="${esc(source.id)}">${esc(source.displayName || source.name)}</button></li>`).join('')}</ul></details>`;
}
