'use strict';
const AnatomyAtlas=(()=>{
 const root='/anatomy-models/';
 const models={
  heart:['Heart & coronary circulation','Cardiovascular','Chambers, valves, coronary vessels and practical labeling.','A4 A5 A6','#9c5363'],
  ribcage:['Ribs & thoracic cage','Thoracic wall','Compare all 12 rib pairs, the sternum, costal cartilage and thoracic vertebrae.','A2 A8 A15','#927250'],
  diaphragm:['Diaphragm','Thoracic wall','Compare the domes and trace the aorta, esophagus and inferior vena cava.','A15 A20','#9a5664'],
  mediastinum:['Mediastinum & great vessels','Cardiovascular','Trace the aortic arch and its branches alongside the great veins, trachea and esophagus.','A11 A14','#6669a2'],
  nose:['Nasal cavity & sinuses','Upper airway','Locate the nasal septum, conchae and paranasal sinuses.','A12 A13','#957344'],
  pharynx:['Pharynx','Upper airway','Explore the constrictors, soft palate muscles and their neighbors.','A12','#8c5d88'],
  larynx:['Larynx & vocal folds','Upper airway','Identify the laryngeal cartilages, vocal ligaments and intrinsic muscles.','A12 A13','#497b79'],
  airway:['Trachea & bronchial tree','Pulmonary','Follow the trachea through the carina into the right and left bronchial trees.','A12 A16 A17 P16','#357989','lungs'],
  lungs:['Lungs & bronchopulmonary segments','Pulmonary','Isolate named segments and see how they surround the branching airway.','A16 A17 P16 P17 P23 P24','#4d6ca2'],
 };
 const airwayParts=['FMA7394','FMA26661','FMA26662'];
 const back='<button type="button" class="atlas-back" data-atlas-back>← All models</button>';
 const codes=items=>items.split(' ').map(code=>'<span>'+code+'</span>').join('');
 function gallery(){
  return intro('CVP 112 · SPATIAL ANATOMY','3D Anatomy Lab','Choose a specimen to rotate, inspect and isolate structures.')+
   '<section class="atlas-gallery" aria-label="Anatomy models">'+Object.entries(models).map(([id,[title,group,note,lessons,tone]],index)=>
   `<button class="atlas-card" type="button" style="--atlas-tone:${tone}" data-atlas-model="${id}">
    <span class="atlas-art"><span class="atlas-category">${group}</span><img src="${root+id}.webp?v=2" alt="" width="560" height="300" ${index>2?'loading="lazy"':''}></span>
    <span class="atlas-copy"><strong>${title}</strong><span class="atlas-description">${note}</span>
    <span class="atlas-card-footer"><span class="atlas-codes">${codes(lessons)}</span><span class="atlas-arrow" aria-hidden="true">↗</span></span></span>
   </button>`).join('')+'</section>';
 }
 function page(id){
  const [title,group,note,lessons,,shared]=models[id];
  const asset=shared||id, official=['ribcage','mediastinum'].includes(asset);
  const credit=official?'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International':
   asset==='nose'?'Z-Anatomy and BodyParts3D / Anatomography, © DBCLS · adapted by OrganUI · CC BY-SA 4.0':
   'BodyParts3D / Anatomography, © DBCLS · adapted by OrganUI · CC BY-SA 2.1 Japan';
  return back+intro('CVP 112 · '+group.toUpperCase(),title,note)+
   `<div id="atlasExplorer" class="atlas-explorer">
    <section class="panel atlas-viewport">
     <div id="atlasStage" class="heart-stage atlas-stage"><div id="atlasStatus" role="status">Loading model…</div><output id="atlasSelected" class="heart-picked" aria-live="polite" hidden></output></div>
     <p class="muted atlas-instructions">Drag to rotate, scroll or pinch to zoom. Select a structure on the model or from the list.</p>
     <div class="atlas-controls"><label>View <select id="atlasView"><option value="anterior">Anterior</option><option value="posterior">Posterior</option><option value="left">Left</option><option value="right">Right</option><option value="superior">Superior</option><option value="custom" hidden>Custom</option></select></label><label><input id="atlasHighlight" type="checkbox" checked> Highlight selection</label></div>
    </section>
    <aside class="panel atlas-parts">
     <h2>Structures</h2><div class="atlas-controls"><button type="button" id="atlasIsolate" disabled>Isolate selected</button><button type="button" id="atlasRestore" disabled>Show all</button></div>
     <label>Find a structure<input type="search" id="atlasSearch" placeholder="Search names"></label>
     <div id="atlasParts" class="atlas-part-list"></div>
     <p class="atlas-lessons">${lessons.split(' ').map(code=>`<button type="button" data-lesson="CVP-${code}">${code} ↗</button>`).join(' ')}</p>
     <details class="muted"><summary>Model credits &amp; limitations</summary><p>${credit}</p>
      <p>Colors distinguish structures. These are selected teaching meshes with simplified boundaries.</p>
      ${asset==='nose'?'<p>The maxillary sinuses are illustrative reconstructions.</p>':''}
      <a href="${official?'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html':root+asset+'-credits.txt'}" target="_blank" rel="noopener">Source and attribution ↗</a> ·
      <a href="${official?'https://creativecommons.org/licenses/by/4.0/':asset==='nose'?'https://creativecommons.org/licenses/by-sa/4.0/':'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en'}" target="_blank" rel="noopener">License ↗</a></details>
    </aside>
   </div>`;
 }
 function mount(id,loadViewer){
  const shell=document.querySelector('#atlasExplorer'), get=id=>shell.querySelector('#'+id);
  const request=new AbortController(), selected=new Set();
  const signal=request.signal, asset=models[id][5]||id;
  const status=get('atlasStatus'), list=get('atlasParts'), label=get('atlasSelected');
  let viewer, labels={}, isolated=false;
  const orderedIds=()=>Object.keys(labels);
  function update(){
   const ids=[...selected];
   label.hidden=!ids.length;
   label.textContent=ids.length>2?ids.length+' structures selected':ids.map(id=>labels[id]).join(' · ');
   for(const button of list.children)button.setAttribute('aria-pressed',String(selected.has(button.dataset.part)));
   get('atlasIsolate').disabled=!ids.length;
   get('atlasRestore').disabled=!isolated;
   if(isolated&&ids.length)viewer?.isolate(ids);
   else viewer?.showAll();
   viewer?.select(ids.at(-1),get('atlasHighlight').checked?ids:[]);
  }
  function pick(id){
   if(!Object.hasOwn(labels,id))return;
   if(selected.has(id))selected.delete(id);else selected.add(id);
   if(!selected.size)isolated=false;
   update();
  }
  function error(message){
   if(signal.aborted)return;
   status.hidden=false;
   status.textContent=message+' ';
   const retry=document.createElement('button');
   retry.type='button';retry.dataset.atlasModel=id;retry.textContent='Retry';
   status.append(retry);
  }
  async function load(){
   try{
    const [response,module]=await Promise.all([fetch(root+'structures.json',{signal}),loadViewer()]);
    if(!response.ok)throw Error('The structure list could not be loaded.');
    const available=(await response.json())[asset];
    if(signal.aborted)return;
    labels=id==='airway'?Object.fromEntries(airwayParts.map(key=>[key,available[key]])):available;
    for(const key of orderedIds()){
     const button=document.createElement('button');
     button.type='button';button.dataset.part=key;button.textContent=labels[key];button.setAttribute('aria-pressed','false');
     list.append(button);
    }
    const instance=await module.mountHeart(get('atlasStage'),{
     signal,modelLabel:models[id][0],localModelURL:root+asset+'.glb.gz',
     visibleIds:orderedIds(),onPick:pick,onError:error,
     onReady(ids){if(orderedIds().some(key=>!ids.includes(key)))throw Error('The model is missing a listed structure.');status.hidden=true;},
     onViewChange(value){get('atlasView').value=value;}
    });
    if(signal.aborted){instance?.dispose();return;}
    viewer=instance;
    viewer?.setView(id==='diaphragm'?'superior':id==='pharynx'?'posterior':'anterior');
    update();
   }catch(e){error(e.message);}
  }
  list.addEventListener('click',e=>{const part=e.target.closest('[data-part]')?.dataset.part;if(part)pick(part);});
  get('atlasSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();for(const b of list.children)b.hidden=!b.textContent.toLowerCase().includes(q);});
  get('atlasHighlight').addEventListener('change',update);
  get('atlasView').addEventListener('change',e=>viewer?.setView(e.target.value));
  get('atlasIsolate').addEventListener('click',()=>{isolated=true;update();});
  get('atlasRestore').addEventListener('click',()=>{isolated=false;update();});
  load();
  return ()=>{request.abort();viewer?.dispose();};
 }
 return {models,back,gallery,page,mount};
})();
