// Reuse the approved REN booklet OSPE figure bank; no new figure or key is invented.
import {loadRenalOspe} from './renal-ospe.mjs';
const topicPattern=/\b(?:renal corpuscles?|glomerul\w*|bowman\w*|podocytes?|proximal (?:convoluted )?tubules?|distal (?:convoluted )?tubules?|collecting ducts?|papillary ducts?|nephrons?|medullary rays?|renal cortex|renal medulla|loop of henle|thin limb|pct|dct)\b/i;
export function relatedHistologyStations(pack){
 const stations=(pack?.stations||[]).filter(s=>s.category==='histology'&&Number.isInteger(s.page)&&s.page>0&&s.figures?.length&&s.parts?.length);
 return stations.map(s=>({...s,relatedA5:s.parts.some(p=>topicPattern.test(p.prompt+' '+p.answer))})).sort((a,b)=>Number(b.relatedA5)-Number(a.relatedA5));
}
let pending,stations,index=0,revealed=false,loadError=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n}
function button(text,fn){const n=el('button',text);n.type='button';n.onclick=fn;return n}
function draw(host){
 if(!host.isConnected)return;
 const body=host.querySelector('[data-ren-histology-body]');body.replaceChildren();
 if(!stations){
  if(pending){const p=el('p','Loading source figures…');p.setAttribute('role','status');body.append(p);return}
  if(loadError){const p=el('p','Could not load the approved booklet figures. Retry when connected.','notice');p.setAttribute('role','status');body.append(p)}
  body.append(button(loadError?'Retry figure loading':'Load histology figures',()=>start(host)));return;
 }
 if(!stations.length){body.append(el('p','No histology stations are available in the source pack.'));return}
 const s=stations[index],p=el('p','Station '+(index+1)+' of '+stations.length+' · booklet p. '+s.page+(s.relatedA5?' · kidney microstructure keyword match':' · broader REN histology'),'muted');
 p.setAttribute('role','status');body.append(p);
 for(const part of s.parts)body.append(el('h4',part.prompt));
 s.figures.forEach((f,i)=>{
  const figure=el('figure','','lesson-figure'),frame=el('div');frame.style.overflow='auto';
  const img=el('img');img.src=f.image;img.alt='Renal histology station, booklet page '+s.page+', figure '+(i+1)+'. Use the station prompt to identify the indicated structure.';img.width=f.width;img.height=f.height;img.loading='lazy';img.style.maxWidth='100%';img.style.height='auto';
  frame.append(img);figure.append(frame,el('figcaption','REN 123 Past Paper Booklet · page '+s.page));
  let enlarged=false;const zoom=button('Enlarge figure',()=>{enlarged=!enlarged;img.style.maxWidth=enlarged?'none':'100%';img.style.width=enlarged?Math.max(480,f.width)+'px':'';zoom.textContent=enlarged?'Fit figure':'Enlarge figure';zoom.setAttribute('aria-pressed',String(enlarged))});zoom.setAttribute('aria-pressed','false');figure.append(zoom);body.append(figure);
 });
 if(revealed){
  const answer=el('div','','notice');answer.append(el('strong','Printed source answer'));
  for(const part of s.parts)answer.append(el('p',part.answer));
  const link=el('a','Open original booklet page ↗');link.href='/api/site-assets/materials/ren123/past-paper-booklet.pdf#page='+s.page;link.target='_blank';link.rel='noopener noreferrer';answer.append(link);body.append(answer);
 }else body.append(button('Reveal printed answer',()=>{revealed=true;draw(host)}));
 const prev=button('← Previous figure',()=>{index--;revealed=false;draw(host)}),next=button('Next figure →',()=>{index++;revealed=false;draw(host)});
 prev.disabled=index===0;next.disabled=index===stations.length-1;const nav=el('div','','lesson-actions');nav.append(prev,next);body.append(nav);
}
function start(host){
 if(!pending){loadError=false;pending=loadRenalOspe().then(pack=>{stations=relatedHistologyStations(pack);index=0;revealed=false}).catch(()=>{loadError=true}).finally(()=>{pending=null;document.querySelectorAll('[data-ren-histology-practice]').forEach(draw)})}
 draw(host);
}
export function mountRenalHistologyPractice(container){
 if(!container||container.querySelector('[data-ren-histology-practice]'))return;
 const host=el('section','','panel'),heading=el('h3','Related renal histology · figure self-check'),note=el('p','Practice with existing approved booklet stations and their original figures. Kidney-microstructure keyword matches appear first; other stations are broader REN histology, not claimed as exact A5 objectives. This self-check does not award lesson completion.','muted'),body=el('div');
 host.dataset.renHistologyPractice='';body.dataset.renHistologyBody='';host.append(heading,note,body);container.append(host);draw(host);
}
