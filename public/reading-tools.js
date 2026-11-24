'use strict';
(()=>{
 const choices={font:[14,17,20,24],line:[1.35,1.7,2.1],width:['standard','narrow','wide'],motion:['system','reduce']};
 function normalizeChoice(value,allowed,fallback){
  if(typeof fallback==='number'){
   if(typeof value!=='number'&&!(typeof value==='string'&&value.trim()!==''))return fallback;
   value=Number(value);if(!Number.isFinite(value))return fallback;
   return allowed.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a,fallback);
  }
  return allowed.includes(value)?value:fallback;
 }
 function preferences(){const p=storeOptions().reading||{};return {font:normalizeChoice(p.font,choices.font,17),line:normalizeChoice(p.line,choices.line,1.7),width:normalizeChoice(p.width,choices.width,'standard'),captions:p.captions!==false,contrast:p.contrast===true,motion:normalizeChoice(p.motion,choices.motion,'system')}}
 function preferenceChange(key,value,p=preferences()){
  if(!Object.hasOwn(p,key))return null;
  if(key==='captions'||key==='contrast'){if(typeof value!=='boolean')return null;return {...p,[key]:value}}
  const normalized=normalizeChoice(value,choices[key],p[key]);
  return {...p,[key]:normalized};
 }
 function readBatchPage(value,offset){
  if(!value||!Number.isSafeInteger(value.duplicates)||value.duplicates<0||!Number.isSafeInteger(value.reclaimed)||value.reclaimed<0||!Number.isSafeInteger(value.total)||value.total<0||!Number.isSafeInteger(value.processed)||value.processed<0||value.processed>value.total||value.next!==null&&(!Number.isSafeInteger(value.next)||value.next<=offset||value.next!==value.processed||value.next>=value.total)||value.next===null&&value.processed!==value.total)throw Error('Invalid storage response. Stop and retry the check.');
  return value;
 }
 function readSavedCount(value){if(!value||value.verified!==true||!Number.isSafeInteger(value.saved)||value.saved<0||value.saved>200)throw Error('Asset verification response was incomplete. Retry the batch.');return value.saved}

 function apply(){const p=preferences(),r=document.documentElement;r.style.setProperty('--reading-size',p.font+'px');r.style.setProperty('--reading-line',p.line);r.style.setProperty('--reading-width',p.width==='narrow'?'62ch':p.width==='wide'?'none':'82ch');r.dataset.figureCaptions=p.captions?'visible':'hidden';r.dataset.readingContrast=p.contrast?'high':'standard';r.dataset.readingMotion=p.motion;for(const key of ['font','line','width','captions','contrast','motion']){const e=document.querySelector('[data-reading-setting="'+key+'"]');if(e){if(e.type==='checkbox')e.checked=p[key];else e.value=p[key]}}}
 const accessibilityStyle=document.createElement('style');accessibilityStyle.textContent='html[data-reading-motion=reduce] *,html[data-reading-motion=reduce] *::before,html[data-reading-motion=reduce] *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important} html[data-reading-contrast=high] :is(.complete-guide,.guide-section,.teaching-card,.answer-feedback,.source-transcript,.lab-topic){color:#111;background-color:#fff} html[data-theme=amoled][data-reading-contrast=high] :is(.complete-guide,.guide-section,.teaching-card,.answer-feedback,.source-transcript,.lab-topic){color:#fff;background-color:#000} html[data-reading-contrast=high] :is(.complete-guide,.guide-section,.teaching-card,.answer-feedback,.source-transcript,.lab-topic) .muted{color:inherit}';document.head.append(accessibilityStyle);
 const panel=document.createElement('section');panel.className='panel reading-settings';panel.innerHTML='<h3>Reading & accessibility</h3><p class="muted">Applies to lessons, explanations and source text. Examplify keeps its own text controls.</p><div class="reading-settings-grid"><label>Text size<select data-reading-setting="font"><option value="14">Small · 14px</option><option value="17">Standard · 17px</option><option value="20">Large · 20px</option><option value="24">Extra large · 24px</option></select></label><label>Line spacing<select data-reading-setting="line"><option value="1.35">Compact</option><option value="1.7">Comfortable</option><option value="2.1">Spacious</option></select></label><label>Reading width<select data-reading-setting="width"><option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option></select></label><label><input type="checkbox" data-reading-setting="captions">Show figure captions</label><label><input type="checkbox" data-reading-setting="contrast">Higher reading contrast</label><label>Motion<select data-reading-setting="motion"><option value="system">Follow device setting</option><option value="reduce">Reduce motion</option></select></label></div><button id="resetReadingSettings">Reset reading preferences</button>';document.querySelector('#siteAdmin .admin-frame')?.append(panel);
 document.addEventListener('change',e=>{const key=e.target.dataset?.readingSetting;if(!key||!panel.contains(e.target))return;const p=preferenceChange(key,e.target.type==='checkbox'?e.target.checked:e.target.value);if(!p)return;saveOptions({...storeOptions(),reading:p});apply()});document.addEventListener('click',e=>{if(e.target.closest('#resetReadingSettings')){saveOptions({...storeOptions(),reading:{}});apply()}});window.addEventListener('study-vault-restored',apply);apply();
 function decorate(html){
  if(typeof html!=='string'||typeof DIAGRAM_VARIANTS==='undefined')return html;
  const safePath=v=>typeof v==='string'&&/^\/(?:api\/(?:study-assets|site-assets)\/|[a-zA-Z0-9_-]+\/)[a-zA-Z0-9_./%-]+$/.test(v)&&!v.includes('..');
  return html.replace(/<img\b[^>]*>/gi,tag=>{
   if(/\sdata-full-src\s*=|\sid\s*=\s*["'](?:uiViewerImage|profile)/i.test(tag))return tag;
   const src=tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1],v=src&&Object.hasOwn(DIAGRAM_VARIANTS,src)?DIAGRAM_VARIANTS[src]:null;
   if(!v||!safePath(src)||!Number.isSafeInteger(v.width)||v.width<1||!Number.isSafeInteger(v.height)||v.height<1)return tag;
   const entries=[480,960].filter(w=>w<v.width&&safePath(v[w])).map(w=>v[w]+' '+w+'w');
   if(!entries.length)return tag;
   entries.push(src+' '+v.width+'w');
   let next=tag.replace(/\s(?:srcset|sizes|decoding)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
   next=next.replace(/\s*\/?>$/,` data-full-src="${src}" srcset="${entries.join(', ')}" sizes="(max-width:760px) calc(100vw - 48px), (max-width:1200px) 65vw, 1000px" decoding="async">`);
   if(!/\sloading\s*=/i.test(next))next=next.replace(/^<img/i,'<img loading="lazy"');
   if(!/\swidth\s*=/i.test(next))next=next.replace(/^<img/i,'<img width="'+v.width+'"');
   if(!/\sheight\s*=/i.test(next))next=next.replace(/^<img/i,'<img height="'+v.height+'"');
   return next
  })
 }
 for(const name of ['sectionCard','conceptQuestionMarkup','etQuestionMarkup','originalQuestionMarkup','documentPanel']){
  // These are existing public classic-script integration points, not dynamically evaluated code.
  if(name==='sectionCard'){const f=sectionCard;sectionCard=(...args)=>decorate(f(...args))}
  if(name==='conceptQuestionMarkup'){const f=conceptQuestionMarkup;conceptQuestionMarkup=(...args)=>decorate(f(...args))}
  if(name==='etQuestionMarkup'){const f=etQuestionMarkup;etQuestionMarkup=(...args)=>decorate(f(...args))}
  if(name==='originalQuestionMarkup'){const f=originalQuestionMarkup;originalQuestionMarkup=(...args)=>decorate(f(...args))}
  if(name==='documentPanel'){const f=documentPanel;documentPanel=(...args)=>decorate(f(...args))}
 }
 document.addEventListener('error',e=>{const img=e.target;if(img?.tagName==='IMG'&&img.dataset.fullSrc&&img.srcset){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=img.dataset.fullSrc}},true);
 const storage=document.createElement('details');storage.className='panel study-resource-storage';storage.innerHTML='<summary>Private study resource storage</summary><p>Lecture and lab originals, models and figures live in your existing private cloud storage.</p><button id="uploadStudyAssets">Import prepared resource batches</button><input id="studyAssetUpload" type="file" accept=".zip,application/zip" multiple hidden><button id="deduplicateMaterials">Clean duplicate resource copies</button><p id="deduplicateStatus" role="status"></p><p id="studyAssetStatus" role="status">No resources transferred in this session.</p>';const storageHost=document.querySelector('#adminSettingsContent');if(!storageHost)return;storageHost.append(storage);document.querySelector('#deduplicateMaterials').onclick=async e=>{const b=e.currentTarget,status=document.querySelector('#deduplicateStatus');if(b.disabled)return;b.disabled=true;let offset=0,duplicates=0,reclaimed=0;try{do{status.textContent='Checking private originals…';const r=await fetch('/api/materials/deduplicate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({offset})}),v=await r.json();if(!r.ok)throw Error(v.error||'Storage check failed');const page=readBatchPage(v,offset);duplicates+=page.duplicates;reclaimed+=page.reclaimed;offset=page.next}while(offset!==null);status.textContent=duplicates+' duplicate copies removed · '+(reclaimed/1048576).toFixed(2)+' MiB reclaimed. All source links and extracted content retained.'}catch(err){status.textContent='Check stopped after '+duplicates+' confirmed duplicate copies. '+err.message}finally{b.disabled=false}};document.querySelector('#uploadStudyAssets').onclick=()=>document.querySelector('#studyAssetUpload').click();document.querySelector('#studyAssetUpload').onchange=async e=>{const files=[...e.target.files],status=document.querySelector('#studyAssetStatus');let saved=0;const button=document.querySelector('#uploadStudyAssets');if(button.disabled||!files.length)return;button.disabled=true;try{for(let i=0;i<files.length;i++){if(files[i].size>24500000)throw Error('Batch exceeds 24.5 MB');status.textContent='Verifying and storing batch '+(i+1)+' / '+files.length+'…';const response=await fetch('/api/study-assets',{method:'POST',headers:{'Content-Type':'application/zip'},body:files[i]}),result=await response.json();if(!response.ok)throw Error(result.error||'Transfer failed');saved+=readSavedCount(result)}status.textContent='Verified '+saved+' private assets. Models and diagrams are ready.'}catch(err){status.textContent='Transfer stopped after '+saved+' confirmed assets: '+err.message+'. Completed batches are retained; retry is safe.'}finally{button.disabled=false;e.target.value=''}};
})();
