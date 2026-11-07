const categories={
 models:['3D models & previews','#a78bfa'],
 figures:['Course figures','#4ea8f6'],
 readings:['Readings & search index','#2bb5a3'],
 learning:['Lesson expansions & extra MCQs','#ed70a0'],
 tools:['PDF, Anki & math tools','#f7a649'],
 app:['App & server','#65bd69'],
 other:['Other files','#a0a9b8'],
 metadata:['Archive overhead','#697384'],
};
const fmt=bytes=>(bytes/1048576).toFixed(bytes<10485760?2:1)+' MiB';
const escape=text=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function storageDetails(build,limit){
 const info=build.breakdown;
 if(!info)return '';
 const rows=Object.entries({...info.categories,metadata:info.metadataBytes})
  .filter(([key,bytes])=>categories[key]&&Number.isSafeInteger(bytes)&&bytes>0)
  .map(([key,bytes])=>[...categories[key],bytes]).sort((a,b)=>b[2]-a[2]);
 const free=Math.max(0,limit-build.measuredExpandedBytes);
 const largest=(info.largest||[]).slice(0,8);
 return `<div class="storage-breakdown">
  <div class="storage-chart" role="img" aria-label="${escape(rows.map(([name,,bytes])=>name+' '+fmt(bytes)).join(', ')+', Available '+fmt(free))}">
   ${[...rows,['Available','var(--storage-free)',free]].map(([name,color,bytes])=>`<span style="--segment-color:${color};flex-grow:${bytes}" title="${name} · ${fmt(bytes)}"></span>`).join('')}
  </div>
  <ul class="storage-legend">${[...rows,['Available','var(--storage-free)',free]].map(([name,color,bytes])=>`<li><i style="--segment-color:${color}"></i><span>${name}</span><strong>${fmt(bytes)}</strong></li>`).join('')}</ul>
  <details class="storage-largest"><summary>Largest files in this build</summary><ul>${largest.map(row=>`<li><code>${escape(row.path.replace(/^client\//,''))}</code><strong>${fmt(row.bytes)}</strong></li>`).join('')}</ul></details>
  <div class="storage-options"><h4>Reduce package size</h4>
   ${build.privateMedia?.offloaded?'<p><strong>Private media offloaded</strong><span>'+build.privateMedia.total+' verified files are served from private storage, reclaiming '+fmt(build.privateMedia.bytes)+' in bundled file bytes.</span></p>':
    build.privateMedia?.total?'<button type="button" id="migratePublisherMedia">Copy publisher files to private storage</button><p id="publisherMediaStatus" role="status"></p>':''}
   ${info.removedBytes>0?`<p><strong>Already saved ${fmt(info.removedBytes)}</strong> by removing ${info.removedFiles} standalone script copies from the publisher package.</p>`:''}
   ${info.modelOffloadBytes>0?`<p><strong>Move model meshes to private storage</strong><span>Reclaim up to ${fmt(info.modelOffloadBytes)} of publisher space. Previews can stay here. Verify every private copy before removing its bundled file.</span></p>`:''}
   ${info.categories.figures>0?`<p><strong>Move older course figures to private storage</strong><span>${fmt(info.categories.figures)} of figures are currently bundled. Offload verified copies while keeping frequently used thumbnails in the app.</span></p>`:''}
  </div>
 </div>`;
}

export function bindMigration(dialog){
 dialog.addEventListener('click',async event=>{
  const button=event.target.closest('#migratePublisherMedia');
  if(!button)return;
  const status=dialog.querySelector('#publisherMediaStatus');
  button.disabled=true;
  try{
   status.textContent='Checking existing private copies…';
   const {syncPrivateMedia}=await import('/private-media-migration.mjs?v=1');
   await syncPrivateMedia(status);
  }catch(error){status.textContent=error.message+' Verified files are retained. You can retry.';}
  finally{button.disabled=false;}
 });
}
