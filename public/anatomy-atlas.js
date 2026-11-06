'use strict';
const AnatomyAtlas=(()=>{
 const root='/anatomy-models/';
 const models={
  heart:['Heart & coronary circulation','Cardiovascular','Chambers, valves, coronary vessels and practical labeling.','A4 A5 A6','#9c5363'],
  ribcage:['Ribs & thoracic cage','Thoracic wall','Compare ribs, costal cartilage, intercostal layers and individual C1–C7 and T1–T12 vertebrae.','A2 A8 A15','#927250'],
  diaphragm:['Diaphragm','Thoracic wall','Compare the domes and trace the aorta, esophagus and inferior vena cava.','A15 A20','#9a5664'],
  mediastinum:['Mediastinum & great vessels','Cardiovascular','Trace the aortic arch and its branches alongside the great veins, trachea and esophagus.','A11 A14','#6669a2'],
  nose:['Nasal cavity & sinuses','Upper airway','Locate the nasal septum, conchae and paranasal sinuses.','A12 A13','#957344'],
  pharynx:['Pharynx','Upper airway','Explore the constrictors, soft palate muscles and their neighbors.','A12','#8c5d88'],
  larynx:['Larynx & vocal folds','Upper airway','Identify the laryngeal cartilages, vocal ligaments and intrinsic muscles.','A12 A13','#497b79'],
  airway:['Trachea & bronchial tree','Pulmonary','Follow the trachea through the carina into the right and left bronchial trees.','A12 A16 A17 P16','#357989','lungs'],
  lungs:['Lungs & bronchopulmonary segments','Pulmonary','Isolate named segments and see how they surround the branching airway.','A16 A17 P16 P17 P23 P24','#4d6ca2'],
 };
 const airwayParts=['FMA7394','FMA26661','FMA26662'];
 const layers={
  ribcage:{'Ribs':/-rib$/,'Costal cartilage':/costal-cartilage/,'Sternum':/manubrium|sternum|xiphoid/,
   'Cervical spine':/atlas|axis|cervical/,'Thoracic spine':/thoracic-vertebra/,
   'External intercostals':/^external/,'Internal intercostals':/^internal/,'Innermost intercostals':/^innermost/},
  diaphragm:{'Diaphragm':/hemidiaphragm/,'Structures crossing the diaphragm':/esophagus|vena-cava|aorta/,
   'Thoracic organs':/heart|lung/,'Abdominal organs':/liver|stomach|spleen/,'Psoas muscles':/psoas/},
  mediastinum:{'Arteries':/aort|artery|pulmonary-trunk/,'Veins':/vein|vena-cava/,'Airway':/trachea/,'Esophagus':/esophagus/},
  nose:{'Paranasal sinuses':/sinus|ethmoid-cells/,'Nasal cavity & conchae':/nasal-cavity|conchae|nasopharynx/,
   'Cartilages & septum':/cartilage|vomer/,'Bones':/bone|maxillae|^ethmoid$/,'Nerves & pituitary':/nerves|pituitary/},
  pharynx:{'Constrictors & raphe':/constrictor|raphe/,'Longitudinal muscles':/pharyngeus/,
   'Soft palate & tongue':/palatini|uvulae|tongue/,'Laryngeal landmarks':/hyoid|cartilage|epiglottis/,
   'Vessels':/artery|plexus/,'Nerves':/nerves/},
  larynx:{'Cartilages & hyoid':/cartilage|hyoid|^epiglottis$/,'Ligaments & membranes':/ligament|membrane|conus/,
   'Intrinsic muscles':/muscle|vocalis|arytenoid$|thyro-arytenoid/,'Trachea & thyroid gland':/trachea|gland/},
  airway:{'Trachea':/^FMA7394$/,'Right bronchial tree':/^FMA26661$/,'Left bronchial tree':/^FMA26662$/},
  lungs:{'Right upper lobe segments':/^FMA(7338|7339|7359)$/,'Right middle lobe segments':/^FMA(7360|7361)$/,
   'Right lower lobe segments':/^FMA736[2-6]$/,'Left upper lobe segments':/^FMA737[2-5]$/,
   'Left lower lobe segments':/^FMA73(76|78|79|80)$/,'Trachea & bronchial trees':/^FMA(7394|26661|26662)$/},
 };
 const notes={
  atlas:'C1 supports the skull. Its ring lacks a vertebral body.',
  axis:'C2 bears the dens, the pivot for rotation of the atlas.',
  'seventh-cervical-vertebra':'C7 is the vertebra prominens and the usual level of a cervical rib.',
  'fourth-thoracic-vertebra':'The sternal-angle plane passes near the T4–T5 intervertebral disc.',
  manubrium:'Its junction with the sternal body forms the sternal angle. Use it to locate the second costal cartilage.',
  'external-intercostal-muscle':'The fibers run inferoanteriorly and help elevate the ribs during inspiration.',
  'internal-intercostal-muscle':'The main intercostal neurovascular bundle lies deep to this layer.',
  'innermost-intercostal-muscle':'The main intercostal bundle runs between this layer and the internal intercostals, in vein–artery–nerve order from superior to inferior.',
  'inferior-vena-cava':'The caval opening is classically at T8, in the central tendon.',
  esophagus:'The esophageal hiatus is classically at T10, within the muscular diaphragm.',
  'descending-aorta':'The aortic hiatus is classically at T12, posterior to the diaphragm.',
  'arch-of-aorta':'Follow the arch branches in order: brachiocephalic trunk, left common carotid, then left subclavian.',
  'azygos-vein':'Its arch passes over the right lung root before joining the superior vena cava.',
  'inferior-conchae':'The inferior conchae are separate bones. The nasolacrimal duct drains into the inferior meatus.',
  'maxillary-sinuses':'The maxillary sinus drains to the middle meatus. Its opening is high on the medial wall.',
  'sphenoid-sinus':'The sphenoid sinus opens into the sphenoethmoidal recess.',
  stylopharyngeus:'CN IX innervates stylopharyngeus, which elevates the pharynx during swallowing.',
  'inferior-constrictor':'Its cricopharyngeal part contributes to the upper esophageal sphincter.',
  'posterior-crico-arytenoid':'This is the only muscle that abducts the vocal folds.',
  'lateral-crico-arytenoid':'This muscle adducts the vocal folds by rotating the arytenoid cartilages.',
  'cricothyroid-muscle':'It tenses the vocal folds and receives the external branch of the superior laryngeal nerve.',
  'cricoid-cartilage':'The cricoid forms a complete ring, with a broad posterior lamina.',
  FMA7394:'The carina marks the tracheal bifurcation near the sternal-angle plane.',
  FMA26661:'The right main bronchus is generally wider, shorter and more vertical than the left.',
  FMA26662:'The left main bronchus runs beneath the aortic arch toward the left lung.',
 };
 const defaultLayer=(id,name)=>id!=='ribcage'||!name.endsWith('intercostals');
 const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
 function groupParts(id,ids){
  const groups=Object.entries(layers[id]).map(([name,match])=>[name,ids.filter(part=>match.test(part))]).filter(([,parts])=>parts.length);
  const used=new Set(groups.flatMap(([,parts])=>parts)), other=ids.filter(part=>!used.has(part));
  if(other.length)groups.push(['Other structures',other]);
  return groups;
 }
 function matchesLabel(answer,label){
  const aliases=[label,...label.split(' · ')];
  if(label.includes(' · '))aliases.push(label.split(' · ').reverse().join(' '));
  if(label==='Brachiocephalic artery')aliases.push('brachiocephalic trunk');
  return aliases.some(alias=>normalize(answer)===normalize(alias));
 }
 const back='<button type="button" class="atlas-back" data-atlas-back>← All models</button>';
 const codes=items=>items.split(' ').map(code=>'<span>'+code+'</span>').join('');
 function gallery(){
  return intro('CVP 112 · SPATIAL ANATOMY','3D Anatomy Lab','Choose a specimen to rotate, inspect and isolate structures.')+
   '<section class="atlas-gallery" aria-label="Anatomy models">'+Object.entries(models).map(([id,[title,group,note,lessons,tone]],index)=>
   `<button class="atlas-card" type="button" style="--atlas-tone:${tone}" data-atlas-model="${id}">
    <span class="atlas-art"><span class="atlas-category">${group}</span><img src="${root+id}.webp?v=3" alt="" width="560" height="300" ${index>2?'loading="lazy"':''}></span>
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
    <div class="atlas-controls atlas-modes" role="group" aria-label="Study mode">
     <button type="button" data-atlas-mode="explore" aria-pressed="true">Explore</button>
     <button type="button" data-atlas-mode="label" aria-pressed="false" disabled>Name the structure</button>
     <button type="button" data-atlas-mode="practical" aria-pressed="false" disabled>Timed practical</button>
    </div>
    <section class="panel atlas-viewport">
     <div id="atlasStage" class="heart-stage atlas-stage"><div id="atlasStatus" role="status">Loading model…</div><output id="atlasSelected" class="heart-picked" aria-live="polite" hidden></output></div>
     <p id="atlasInstructions" class="muted atlas-instructions">Drag to rotate, scroll or pinch to zoom. Select a structure on the model or from the list.</p>
     <div class="atlas-controls"><label>View <select id="atlasView"><option value="anterior">Anterior</option><option value="posterior">Posterior</option><option value="left">Left</option><option value="right">Right</option><option value="superior">Superior</option><option value="custom" hidden>Custom</option></select></label><label><input id="atlasHighlight" type="checkbox" checked> Highlight selection</label><label>Opacity <input id="atlasOpacity" type="range" min=".25" max="1" step=".05" value="1"></label><button id="atlasReset" type="button">Reset view</button></div>
     <div id="atlasActivity" aria-live="polite" hidden></div>
    </section>
    <aside class="panel atlas-parts">
     <div id="atlasExplore"><h2>Structures</h2><p id="atlasKnown" class="muted"></p>
     <details class="atlas-layer-menu"><summary>Visible layers</summary><div id="atlasLayers"></div></details><div class="atlas-controls"><button type="button" id="atlasIsolate" disabled>Isolate selected</button><button type="button" id="atlasRestore" disabled>Show all</button><button type="button" id="atlasClear" disabled>Clear selection</button></div>
     <label>Find a structure<input type="search" id="atlasSearch" placeholder="Search names"></label>
     <div id="atlasParts" class="atlas-part-list"></div><p id="atlasNote" class="muted" hidden></p></div>
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
  let viewer, labels={}, groups=[], isolated=false, ready=false, mode='explore', run=null, timer;
  const defaultView=id==='diaphragm'?'superior':id==='pharynx'?'posterior':'anterior';
  const activity=get('atlasActivity');
  const quizModes=[...shell.querySelectorAll('[data-atlas-mode]')];
  const orderedIds=()=>Object.keys(labels);
  const visibleIds=()=>[...new Set([...get('atlasLayers').querySelectorAll('input:checked')].flatMap(box=>groups[Number(box.value)][1]))];
  function noteFor(part){return id==='mediastinum'&&part==='esophagus'?'Trace the esophagus posterior to the trachea into the posterior mediastinum.':notes[part]||'';}
  function update(){
   if(mode!=='explore')return;
   const ids=[...selected];
   label.hidden=!ids.length;
   label.textContent=ids.length>2?ids.length+' structures selected':ids.map(id=>labels[id]).join(' · ');
   for(const button of list.children)button.setAttribute('aria-pressed',String(selected.has(button.dataset.part)));
   get('atlasIsolate').disabled=!ids.length;
   get('atlasRestore').disabled=!isolated;
   get('atlasClear').disabled=!ids.length;
   const note=get('atlasNote');
   note.textContent=noteFor(ids.at(-1));
   note.hidden=!note.textContent;
   if(isolated&&ids.length)viewer?.isolate(ids);
   else viewer?.showAll();
   viewer?.select(ids.at(-1),get('atlasHighlight').checked?ids:[]);
  }
  function pick(id){
   if(!ready||!Object.hasOwn(labels,id))return;
   if(mode==='practical'&&run&&!run.finished){record(id);return;}
   if(mode!=='explore'||!visibleIds().includes(id))return;
   if(selected.has(id))selected.delete(id);else selected.add(id);
   if(!selected.size)isolated=false;
   update();
  }
  function updateKnown(){
   const latest=new Map();
   for(const attempt of storeOptions().anatomy?.attempts||[]){
    if(attempt.model!==id)continue;
    const previous=latest.get(attempt.structure);
    if(!previous||Date.parse(previous.at)<=Date.parse(attempt.at))latest.set(attempt.structure,attempt);
   }
   const known=orderedIds().filter(part=>latest.get(id+'/'+part)?.correct).length;
   get('atlasKnown').textContent=known+' / '+orderedIds().length+' identified in practice';
  }
  function saveResults(){
   const options=storeOptions(), anatomy=options.anatomy||{}, at=new Date().toISOString();
   const attempts=run.answers.filter(a=>a.answer!==null).map(a=>({...a,structure:id+'/'+a.structure,
    id:crypto.randomUUID(),model:id,kind:mode,at}));
   if(attempts.length)saveOptions({...options,anatomy:{...anatomy,attempts:[...(anatomy.attempts||[]),...attempts].slice(-500)}});
  }
  function setMode(value){
   clearInterval(timer);run=null;mode=value;
   const exploring=mode==='explore';
   for(const button of quizModes)button.setAttribute('aria-pressed',String(button.dataset.atlasMode===mode));
   get('atlasExplore').hidden=!exploring;
   get('atlasSelected').hidden=true;
   get('atlasInstructions').hidden=!exploring;
   get('atlasOpacity').disabled=!exploring;
   get('atlasHighlight').disabled=!exploring;
   get('atlasReset').disabled=!exploring;
   activity.hidden=exploring;
   viewer?.setParts(exploring?visibleIds():orderedIds());
   viewer?.setOpacity(exploring?Number(get('atlasOpacity').value):1);
   viewer?.select(null);
   if(exploring)update();else paint();
  }
  function start(ids){
   const targetIds=ids||ExamEngine.shuffle(visibleIds()).slice(0,12);
   if(!targetIds.length)return;
   const seconds=Number(get('atlasMinutes')?.value||3)*60;
   run={ids:targetIds,index:0,answers:[],deadline:mode==='practical'?Date.now()+seconds*1000:null};
   viewer.setParts(visibleIds());
   present();
   if(run.deadline)timer=setInterval(tick,250);
  }
  function present(){
   const target=run.ids[run.index];
   viewer.showAll();
   if(mode==='practical')viewer.setView(defaultView);
   if(mode==='label'){viewer.isolate(target);viewer.setView(defaultView,true);viewer.select(target);}
   else viewer.select(null);
   paint();tick();
   if(mode==='practical')get('atlasStage').querySelector('canvas')?.focus({preventScroll:true});
   if(mode==='label')get('atlasAnswer')?.focus({preventScroll:true});
  }
  function record(answer){
   if(!run||run.finished||run.answers.length>run.index)return;
   if(run.deadline&&Date.now()>=run.deadline){finish();return;}
   const structure=run.ids[run.index];
   const correct=answer!==null&&(mode==='label'?matchesLabel(answer,labels[structure]):answer===structure);
   run.answers.push({structure,correct,answer});
   if(mode==='label'){paint();get('atlasNext')?.focus({preventScroll:true});}else next();
  }
  function next(){
   if(++run.index>=run.ids.length)finish();else present();
  }
  function finish(){
   if(run.finished)return;
   clearInterval(timer);run.finished=true;
   for(const structure of run.ids.slice(run.answers.length))run.answers.push({structure,correct:false,answer:null});
   run.correct=run.answers.filter(answer=>answer.correct).length;
   run.saved=mode==='label'||run.correct/run.ids.length>=.15;
   if(run.saved){saveResults();updateKnown();}
   viewer.showAll();viewer.select(null);paint();
  }
  function tick(){
   if(!run?.deadline||run.finished)return;
   const remaining=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
   const clock=get('atlasClock');
   if(clock)clock.textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
   if(!remaining)finish();
  }
  function paint(){
   if(!run){
    activity.innerHTML='<h3>'+ (mode==='label'?'Name the highlighted structure':'Find the named structure')+'</h3><p>Practice up to 12 structures from the enabled layers.</p>'+
     (mode==='practical'?'<label>Time limit <select id="atlasMinutes"><option>2</option><option selected>3</option><option>5</option></select> minutes</label>':'')+
     '<button type="button" class="primary" data-atlas-action="start">Start practice</button>';
    return;
   }
   if(run.finished){
    activity.innerHTML=scoreRing(Math.round(100*run.correct/run.ids.length),'3D identification',run.correct+' / '+run.ids.length+' correct')+
     '<p>'+(run.saved?'3D practice is tracked separately from lesson mastery.':'Below 15% · result shown for review only.')+'</p>'+
     run.answers.map(a=>'<details class="heart-result '+(a.correct?'correct':'incorrect')+'"><summary>'+
      (a.correct?'✓ ':'↻ ')+esc(labels[a.structure])+'</summary>'+
      (a.answer!==null?'<p>Your answer: '+esc(labels[a.answer]||a.answer)+'</p>':'')+
      (noteFor(a.structure)?'<p>'+esc(noteFor(a.structure))+'</p>':'')+
      '<button type="button" data-atlas-review="'+esc(a.structure)+'">Locate in model</button></details>').join('')+
     '<div class="atlas-controls"><button type="button" data-atlas-action="new">New session</button>'+
     (run.correct<run.ids.length?'<button type="button" data-atlas-action="retry">Retry missed structures</button>':'')+'</div>';
    return;
   }
   const target=run.ids[run.index], result=run.answers[run.index], labeling=mode==='label';
   activity.innerHTML='<div class="heart-task-heading"><span class="pill">'+(run.index+1)+' / '+run.ids.length+'</span>'+
    (run.deadline?'<strong id="atlasClock" role="timer" aria-live="off"></strong>':'')+'</div>'+
    '<h3>'+(labeling?'Name the highlighted structure':'Find: '+esc(labels[target]))+'</h3>'+
    (labeling?(result?'<p class="answer-feedback '+(result.correct?'success':'retry')+'">'+
      (result.correct?'Correct. ':'Review: ')+esc(labels[target])+ (noteFor(target)?' · '+esc(noteFor(target)):'')+
      '</p><button type="button" class="primary" id="atlasNext" data-atlas-action="next">Next</button>':
      '<form id="atlasLabelForm"><label>Your label<input id="atlasAnswer" required autocomplete="off" maxlength="120"></label><button class="primary">Check label</button> <button type="button" data-atlas-action="reveal">Show answer</button></form>'):
      '<p>Select the structure on the model. Rotate or use the view menu to inspect another angle.</p><button type="button" data-atlas-action="finish">Finish &amp; review</button>')+
    ' <button type="button" class="text-button" data-atlas-action="new">Cancel session</button>';
  }
  function error(message){
   if(signal.aborted)return;
   ready=false;
   for(const button of quizModes)if(button.dataset.atlasMode!=='explore')button.disabled=true;
   status.hidden=false;
   status.textContent=message+' ';
   const retry=document.createElement('button');
   retry.type='button';retry.dataset.atlasModel=id;retry.textContent='Retry';
   status.append(retry);
  }
  async function load(){
   try{
    const [response,module]=await Promise.all([fetch(root+'structures.json?v=3',{signal}),loadViewer()]);
    if(!response.ok)throw Error('The structure list could not be loaded.');
    const available=(await response.json())[asset];
    if(signal.aborted)return;
    labels=id==='airway'?Object.fromEntries(airwayParts.map(key=>[key,available[key]])):available;
    groups=groupParts(id,orderedIds());
    updateKnown();
    get('atlasLayers').innerHTML=groups.map(([name],index)=>'<label><input type="checkbox" value="'+index+'" '+(defaultLayer(id,name)?'checked':'')+'> '+esc(name)+'</label>').join('');
    for(const key of orderedIds()){
     const button=document.createElement('button');
     button.type='button';button.dataset.part=key;button.textContent=labels[key];button.setAttribute('aria-pressed','false');
     list.append(button);
    }
    const instance=await module.mountHeart(get('atlasStage'),{
     signal,modelLabel:models[id][0],localModelURL:root+asset+'.glb.gz'+(asset==='ribcage'?'?v=3':''),
     visibleIds:visibleIds(),onPick:pick,onError:error,
     onReady(ids){if(orderedIds().some(key=>!ids.includes(key)))throw Error('The model is missing a listed structure.');status.hidden=true;ready=true;},
     onViewChange(value){get('atlasView').value=value;}
    });
    if(signal.aborted){instance?.dispose();return;}
    viewer=instance;
    viewer?.setView(defaultView);
    for(const button of quizModes)if(button.dataset.atlasMode!=='explore')button.disabled=!ready;
    filter();update();
   }catch(e){error(e.message);}
  }
  list.addEventListener('click',e=>{const part=e.target.closest('[data-part]')?.dataset.part;if(part)pick(part);});
  function filter(){
   const q=get('atlasSearch').value.trim().toLowerCase(), visible=new Set(visibleIds());
   for(const b of list.children)b.hidden=!visible.has(b.dataset.part)||!b.textContent.toLowerCase().includes(q);
  }
  get('atlasSearch').addEventListener('input',filter);
  get('atlasLayers').addEventListener('change',e=>{
   const ids=visibleIds();
   if(!ids.length){e.target.checked=true;return;}
   for(const part of selected)if(!ids.includes(part))selected.delete(part);
   if(!selected.size)isolated=false;
   viewer?.setParts(ids);filter();update();
  });
  for(const button of quizModes)button.addEventListener('click',()=>setMode(button.dataset.atlasMode));
  activity.addEventListener('submit',e=>{e.preventDefault();const answer=get('atlasAnswer').value.trim();if(answer)record(answer);});
  activity.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   const {atlasAction:action,atlasReview:review}=button.dataset;
   if(review){
    setMode('explore');selected.clear();selected.add(review);isolated=true;update();
    viewer.setView(defaultView,true);get('atlasStage').scrollIntoView({block:'center'});return;
   }
   if(action==='start')start();
   if(action==='new')setMode(mode);
   if(action==='next')next();
   if(action==='finish')finish();
   if(action==='reveal')record(null);
   if(action==='retry'){const missed=run.answers.filter(a=>!a.correct).map(a=>a.structure);setMode(mode);start(missed);}
  });
  get('atlasClear').addEventListener('click',()=>{selected.clear();isolated=false;update();});
  get('atlasOpacity').addEventListener('input',e=>viewer?.setOpacity(Number(e.target.value)));
  get('atlasReset').addEventListener('click',()=>{
   for(const box of get('atlasLayers').querySelectorAll('input'))box.checked=defaultLayer(id,groups[Number(box.value)][0]);
   selected.clear();isolated=false;get('atlasSearch').value='';get('atlasOpacity').value=1;
   viewer?.setOpacity(1);viewer?.setParts(visibleIds());viewer?.setView(defaultView);filter();update();
  });
  get('atlasHighlight').addEventListener('change',update);
  get('atlasView').addEventListener('change',e=>viewer?.setView(e.target.value));
  get('atlasIsolate').addEventListener('click',()=>{isolated=true;update();});
  get('atlasRestore').addEventListener('click',()=>{isolated=false;update();});
  load();
  return ()=>{clearInterval(timer);request.abort();viewer?.dispose();};
 }
 return {models,back,gallery,page,mount,groupParts,matchesLabel};
})();
