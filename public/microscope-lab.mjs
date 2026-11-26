import {escapeHTML as escape} from './html-escape.mjs';

const catalogPath='/api/site-assets/materials/ren123/microscope/catalog-v3.json';
let libraryRequest,viewerRequest;
async function catalog(){
 const result=await fetch(catalogPath);
 if(!result.ok)throw Error('Shared slides could not load.');
 return result.json();
}
function renderer(){
 return viewerRequest??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='/vendor/openseadragon-6.1.1.min.js';
  script.onload=()=>resolve(globalThis.OpenSeadragon);
  script.onerror=()=>{script.remove();reject(Error('The slide viewer could not load.'))};
  document.head.append(script);
 }).catch(error=>{viewerRequest=null;throw error});
}

// Ignore isolated bright specks near the edges of otherwise black scan margins.
export function tissueFrame(pixels,width,height){
 const rows=new Uint16Array(height),columns=new Uint16Array(width);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=4*(y*width+x);
  if(pixels[i+3]<128||Math.max(pixels[i],pixels[i+1],pixels[i+2])<44)continue;
  rows[y]++;columns[x]++;
 }
 const span=(counts,cross)=>{
  const threshold=Math.max(2,Math.ceil(cross*.025)),start=counts.findIndex(n=>n>=threshold),end=counts.findLastIndex(n=>n>=threshold)+1;
  if(start<0||end-start<counts.length*.12)return null;
  const margin=Math.ceil((end-start)*.04);
  return [Math.max(0,start-margin)/counts.length,Math.min(counts.length,end+margin)/counts.length];
 };
 const horizontal=span(columns,height),vertical=span(rows,width);
 return horizontal&&vertical?{x:horizontal[0],y:vertical[0],width:horizontal[1]-horizontal[0],height:vertical[1]-vertical[0]}:null;
}

async function thumbnailFrame(bytes){
 const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));
 try{
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');
  context.drawImage(bitmap,0,0);
  return tissueFrame(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
 }finally{bitmap.close()}
}

export async function slideSource(read,size){
 const length=new DataView(await read(0,4)).getUint32(0);
 if(length<2||length>8*1024*1024||4+length>=size)throw Error('Invalid slide index.');
 const {width,height,tileSize,overlap,tiles}=JSON.parse(new TextDecoder().decode(await read(4,length)));
 const positive=(v,max)=>Number.isSafeInteger(v)&&v>0&&v<=max;
 if(!positive(width,1000000)||!positive(height,1000000)||!positive(tileSize,1024)||overlap!==1||!tiles||typeof tiles!=='object')throw Error('Invalid slide layout.');
 const start=4+length,maxLevel=Math.ceil(Math.log2(Math.max(width,height)));
 const thumbnail=tiles[Math.min(maxLevel,Math.floor(Math.log2(tileSize)))+'/0_0'];
 const frame=()=>Array.isArray(thumbnail)&&Number.isSafeInteger(thumbnail[0])&&thumbnail[0]>=0&&
  positive(thumbnail[1],2*1024*1024)&&start+thumbnail[0]+thumbnail[1]<=size
  ?read(start+thumbnail[0],thumbnail[1]).then(thumbnailFrame).catch(()=>null):Promise.resolve(null);
 return {
  frame,
  width,height,tileSize,tileOverlap:overlap,minLevel:0,maxLevel,
  getTileUrl(level,x,y){return level+'/'+x+'_'+y},
  tileExists(level,x,y){return Object.hasOwn(tiles,this.getTileUrl(level,x,y))},
  async downloadTileStart(job){
   const entry=tiles[job.src],controller=new AbortController();
   job.userData.controller=controller;
   try{
    if(!Array.isArray(entry)||!Number.isSafeInteger(entry[0])||entry[0]<0||!positive(entry[1],2*1024*1024)||start+entry[0]+entry[1]>size)throw Error('Invalid slide tile.');
    const bytes=await read(start+entry[0],entry[1],controller.signal);
    if(controller.signal.aborted)return;
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'})),image=new Image();
    job.userData.blob=url;
    image.onload=()=>{URL.revokeObjectURL(url);if(!controller.signal.aborted)job.finish(image,null,'image')};
    image.onerror=()=>{URL.revokeObjectURL(url);if(!controller.signal.aborted)job.fail('Could not decode slide tile.')};
    image.src=url;
   }catch(error){if(!controller.signal.aborted)job.fail(error.message)}
  },
  downloadTileAbort(job){
   job.userData.controller?.abort();
   if(job.userData.blob)URL.revokeObjectURL(job.userData.blob);
  }
 };
}
async function readRange(url,offset,length,signal){
 const response=await fetch(url,{headers:{Range:'bytes='+offset+'-'+(offset+length-1)},signal});
 if(response.status!==206){await response.body?.cancel();throw Error('Slide data could not load.')}
 const result=await response.arrayBuffer();
 if(result.byteLength!==length)throw Error('Incomplete slide data.');
 return result;
}

function sharedSlide(slide){
 const valid=url=>/^[/]api[/]site-assets[/]materials[/]ren123[/]microscope[/][a-z0-9-]+[.]rslide$/.test(url);
 if(valid(slide.url))return slideSource((offset,length,signal)=>readRange(slide.url,offset,length,signal),slide.size);
 let total=0;
 if(!Array.isArray(slide.parts)||!slide.parts.length||slide.parts.some(part=>!valid(part.url)||!Number.isSafeInteger(part.size)||part.size<1))throw Error('Invalid shared slide.');
 const parts=slide.parts.map(part=>{const start=total;total+=part.size;return {...part,start,end:total}});
 if(total!==slide.size)throw Error('Incomplete shared slide.');
 return slideSource(async(offset,length,signal)=>{
  const end=offset+length;
  const chunks=parts.filter(part=>part.start<end&&part.end>offset);
  const result=new Uint8Array(length);
  await Promise.all(chunks.map(async part=>{
   const start=Math.max(offset,part.start),count=Math.min(end,part.end)-start;
   result.set(new Uint8Array(await readRange(part.url,start-part.start,count,signal)),start-offset);
  }));
  return result.buffer;
 },total);
}

const isLabelScan=slide=>/-scan-1$/i.test(slide.id)||/\bScan\s+1\s*$/i.test(slide.name);
export function microscopeCards(group){
 const specimens=new Map();
 for(const slide of group.slides){
  const key=slide.sourceSlide||slide.id;
  if(!specimens.has(key))specimens.set(key,[]);
  specimens.get(key).push(slide);
 }
 return '<h3>'+escape(group.title)+'</h3><div class="microscope-cards">'+[...specimens.values()].map(scans=>{
  const [first]=scans;
  const [primary,...otherScans]=scans.filter(slide=>!isLabelScan(slide));
  const title=first.specimen||first.name;
  const cover=/^\/api\/site-assets\/materials\/ren123\/microscope\/[a-z0-9-]+-cover\.jpg$/.test(first.cover||'')
   ?'<img src="'+escape(first.cover)+'" alt="Original slide label and specimen" loading="lazy" decoding="async">':'';
  const detail=first.name.replace(/ · Scan \d+$/,'');
  const copy=`${cover}<span class="microscope-card-copy"><strong>${escape(title)}</strong>
   <small>${[first.accession,detail].filter(Boolean).map(escape).join(' · ')}</small></span>`;
  return `<article class="microscope-card">${primary
   ?`<button class="microscope-card-cover" type="button" data-slide="${escape(primary.id)}" aria-pressed="false">${copy}</button>`
   :`<div class="microscope-card-cover">${copy}<small class="microscope-card-copy">No tissue scan available</small></div>`}
   ${otherScans.length?`<div class="microscope-scan-options" aria-label="More scans of ${escape(title)}">${otherScans.map(slide=>`<button type="button" data-slide="${escape(slide.id)}" aria-pressed="false">${escape(slide.name.match(/Scan \d+$/i)?.[0]||slide.name)}</button>`).join('')}</div>`:''}</article>`;
 }).join('')+'</div>';
}

export function mount(host){
 let viewer=null,generation=0;
 const controller=new AbortController();
 host.innerHTML=`<div class="intro"><span class="eyebrow">Histology lab</span><h1>Microscope Lab</h1></div>
 <div class="anatomy-layout microscope-layout">
  <section class="panel anatomy-workspace">
   <div class="section-head"><h2 data-slide-title>Slide viewer</h2><div role="group" aria-label="Magnification">
    <button type="button" data-mag="out" aria-label="Zoom out" disabled>−</button>
    <button type="button" data-mag="home" disabled>Fit</button>
    <button type="button" data-mag="in" aria-label="Zoom in" disabled>+</button>
   </div></div>
   <div class="microscope-stage" data-slide-stage aria-label="Slide image"></div>
   <p role="status" data-slide-status>Select a slide to begin.</p>
  </section>
  <section class="panel microscope-library"><h2>Slide library</h2>
   <div data-slide-library role="group" aria-label="Shared Renal slides"><p>Opening the slide library…</p></div>
   <label class="microscope-import">Open a local slide<input type="file" accept=".rslide,image/jpeg,image/png,image/webp"></label>
  </section>
 </div>`;
 const stage=host.querySelector('[data-slide-stage]'),status=host.querySelector('[data-slide-status]'),title=host.querySelector('[data-slide-title]'),list=host.querySelector('[data-slide-library]');
 const controls=[...host.querySelectorAll('[data-mag]')];
 let releaseImage,fitSlide;
 const reset=()=>{viewer?.destroy();viewer=null;fitSlide=null;releaseImage?.();releaseImage=null;stage.replaceChildren();for(const button of controls)button.disabled=true};
 async function open(name,source){
  const revision=++generation;
  reset();title.textContent=name;status.textContent='Opening slide…';
  try{
   const [create,tileSource]=await Promise.all([renderer(),Promise.resolve().then(source)]);
   if(revision!==generation||!host.isConnected){if(tileSource.type==='image')URL.revokeObjectURL(tileSource.url);return}
   if(tileSource.type==='image')releaseImage=()=>URL.revokeObjectURL(tileSource.url);
   const {frame:readFrame,...sourceOptions}=tileSource;
   const framePromise=readFrame?.();
   viewer=create({element:stage,tileSources:sourceOptions,drawer:'canvas',showNavigationControl:false,showNavigator:true,
    minZoomImageRatio:1,visibilityRatio:1,maxZoomPixelRatio:2,animationTime:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.35,
    maxImageCacheCount:120,imageLoaderLimit:5,gestureSettingsTouch:{pinchToZoom:true}});
   const updateZoomOut=()=>{
    const viewport=viewer?.viewport;
    controls[0].disabled=!viewport||viewport.getZoom()<=viewport.getMinZoom()+1e-6;
   };
   for(const event of ['zoom','animation-finish','resize'])viewer.addHandler(event,updateZoomOut);
   viewer.addOnceHandler('open',async()=>{
    const frame=await framePromise;
    if(revision!==generation||!viewer)return;
    const viewport=viewer.viewport;
    fitSlide=()=>{
     viewport.minZoomLevel=null;
     if(!frame){viewport.goHome(true);return}
     const aspect=sourceOptions.height/sourceOptions.width,rect=new create.Rect(frame.x,frame.y*aspect,frame.width,frame.height*aspect);
     viewport.fitBounds(rect,true);
     // The fit is the floor for wheel, pinch, and button zoom.
     viewport.minZoomLevel=Math.max(viewport.getHomeZoom(),viewport.getZoom());
     viewport.applyConstraints(true);
    };
    fitSlide();
    viewer.addHandler('resize',()=>{
     if(!frame)return;
     const aspect=sourceOptions.height/sourceOptions.width;
     viewport.minZoomLevel=Math.max(viewport.getHomeZoom(),Math.min(1/frame.width,1/(frame.height*aspect*viewport.getAspectRatio())));
     viewport.applyConstraints(true);
     updateZoomOut();
    });
    status.textContent='Drag to move. Pinch or use + and − to zoom.';
    for(const button of controls)button.disabled=false;
    updateZoomOut();
   });
   viewer.addOnceHandler('open-failed',()=>{status.textContent='This slide could not open. Select it again to retry.'});
   viewer.addHandler('tile-load-failed',()=>{status.textContent='Some slide tiles could not load. Select the slide again to retry.'});
  }catch(error){if(revision===generation)status.textContent=error.message}
 }
 function loadLibrary(){
  libraryRequest??=catalog().catch(error=>{libraryRequest=null;throw error});
  libraryRequest.then(groups=>{
   if(controller.signal.aborted)return;
   list.innerHTML=groups.map(microscopeCards).join('');
   list.onclick=event=>{
    const button=event.target.closest('[data-slide]');
    const slide=groups.flatMap(group=>group.slides).find(item=>item.id===button?.dataset.slide);
    if(!slide||isLabelScan(slide))return;
    for(const node of list.querySelectorAll('[data-slide]'))node.setAttribute('aria-pressed',String(node===button));
    if(matchMedia('(max-width:760px)').matches)stage.closest('.anatomy-workspace').scrollIntoView({block:'start'});
    open(slide.specimen?[slide.specimen,slide.accession,slide.name.match(/Scan \d+$/)?.[0]].filter(Boolean).join(' · '):slide.name,()=>sharedSlide(slide));
   };
  }).catch(error=>{
   if(controller.signal.aborted)return;
   list.textContent=error.message+' ';
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=loadLibrary;list.append(retry);
  });
 }
 loadLibrary();
 host.querySelector('input[type=file]').onchange=event=>{
  const file=event.target.files[0];event.target.value='';
  if(!file)return;
  if(!/[.]rslide$/i.test(file.name)&&!['image/jpeg','image/png','image/webp'].includes(file.type)){
   status.textContent='Choose a converted .rslide, JPEG, PNG or WebP file.';return;
  }
  for(const node of list.querySelectorAll('[data-slide]'))node.setAttribute('aria-pressed','false');
  open(file.name,()=>/[.]rslide$/i.test(file.name)
   ?slideSource((offset,length)=>file.slice(offset,offset+length).arrayBuffer(),file.size)
   :Promise.resolve({type:'image',url:URL.createObjectURL(file)}));
 };
 for(const button of controls)button.onclick=()=>{
  const viewport=viewer?.viewport;
  if(!viewport)return;
  if(button.dataset.mag==='home')fitSlide?.();
  else viewport.zoomBy(button.dataset.mag==='in'?1.6:.625).applyConstraints();
 };
 return ()=>{generation++;controller.abort();reset()};
}
