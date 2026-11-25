'use strict';
const cvpSectionCard = sectionCard;
const cvpNarrationRates = [1, 1.25, 1.5, 1.75, 2];

function cvpNarrationMarkup(clip) {
  const ref = {source: clip.source, page: clip.page};
  return `<div class="topic-narration-clip">
    <p>Slide ${esc(clip.page)} · ${sourceLink(ref)}</p>
    <audio controls preload="none" src="${esc(clip.url)}" aria-label="Narration for slide ${esc(clip.page)}"></audio>
    <label>Playback speed <select data-cvp-narration-rate aria-label="Playback speed for slide ${esc(clip.page)}">
      ${cvpNarrationRates.map(rate => `<option value="${rate}">${rate}×</option>`).join('')}
    </select></label>
  </div>`;
}

sectionCard = function (x, section, i) {
  const html = cvpSectionCard(x, section, i);
  if (!x.id.startsWith('CVP-')) return html;
  const narration = (section.references || []).flatMap(ref => {
    const page = sourceById(ref.source)?.pages?.find(p => p.page === ref.page);
    return (page?.audio || []).map(url => ({url, page: ref.page, source: ref.source}));
  });
  if (!narration.length) return html;
  const controls = `<details class="topic-narration"><summary>Listen to lecture narration · ${narration.length} source clips</summary>${narration.map(cvpNarrationMarkup).join('')}</details>`;
  // Keep audio and slide links outside the collapsed source disclosure.
  return html.replace('</article>', () => controls + '</article>');
};

document.addEventListener('change', event => {
  const select = event.target;
  if (!select?.matches?.('[data-cvp-narration-rate]')) return;
  const audio = select.closest('.topic-narration-clip')?.querySelector('audio');
  const rate = Number(select.value);
  if (!audio || !cvpNarrationRates.includes(rate)) return;
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
});
