/* Versioned companion stores shared by device saving, backup and private cloud sync. */
const StudyVault=(()=>{
 const prefix='alfaisal-review-studio-v1',metaKey=prefix+'-vault-meta-v1';
 const names={'wrong-bank-v1':'wrongBank','mock-history-v1':'history','mock-exam-v1':'mock','original-exam-runs-v1':'originals','lesson-drafts-v1':'drafts','study-resume-v1':'resume','study-practice-v1':'practice','upload-review-v1':'queue','visual-recall-v1':'visual','anki-progress-v1':'anki','study-options-v1':'options'};
 const byName=Object.fromEntries(Object.entries(names).map(([k,v])=>[v,prefix+'-'+k]));let muted=false,meta={};const corrupt=new Set();
 const known=name=>typeof name==='string'&&Object.hasOwn(byName,name),stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v)),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 try{const raw=JSON.parse(localStorage.getItem(metaKey)||'{}');if(object(raw))meta=Object.fromEntries(Object.entries(raw).filter(([name,at])=>known(name)&&stamp(at)))}catch{}
 function safeTree(value){
  const stack=[[value,0]];let count=0;
  while(stack.length){const [v,depth]=stack.pop();if(depth>64||++count>2000000)throw Error('Study data is too deeply nested or large');if(v===undefined&&depth>0)continue;if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))continue;
   if(!v||typeof v!=='object')throw Error('Invalid saved study value');
   for(const k of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe study data field');stack.push([v[k],depth+1])}
  }
 }
 const rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;
 function changed(key){const suffix=key.startsWith(prefix+'-')?key.slice(prefix.length+1):'',name=Object.hasOwn(names,suffix)?names[suffix]:null;if(muted||!name)return;meta[name]=new Date().toISOString();try{rawSet.call(localStorage,metaKey,JSON.stringify(meta))}catch{if(typeof toast==='function')toast('Study metadata could not be saved; retrying cloud sync.')}finally{if(typeof scheduleSync==='function')scheduleSync()}}
 Storage.prototype.setItem=function(k,v){const previous=this.getItem(k);if(this===localStorage&&!muted&&corrupt.has(String(k)))throw Error('Corrupt study data retained. Export the damaged store before recovery.');rawSet.call(this,k,v);if(this===localStorage&&previous!==String(v))changed(String(k))};
 Storage.prototype.removeItem=function(k){const existed=this.getItem(k)!==null;if(this===localStorage&&!muted&&corrupt.has(String(k)))throw Error('Corrupt study data retained. Export the damaged store before recovery.');rawRemove.call(this,k);if(this===localStorage&&existed)changed(String(k))};
 function read(name,fallback=null){if(!known(name))throw Error('Unknown study store');const key=byName[name];try{const value=JSON.parse(localStorage.getItem(key)||'null');corrupt.delete(key);return value??fallback}catch{if(!corrupt.has(key)){corrupt.add(key);if(typeof window!=='undefined'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('study-vault-corrupt',{detail:{name}}));if(typeof toast==='function')toast('Saved '+name+' data cannot be read. The original copy is retained; export damaged data before recovery.')}return fallback}}
 function set(name,value){if(!known(name))throw Error('Unknown study store');const serialized=JSON.stringify(value);if(serialized===undefined)throw Error('Invalid study value');if(serialized!==JSON.stringify(read(name)))localStorage.setItem(byName[name],serialized)}
 function shape(name,v){if(v===null)return true;const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x)),question=q=>obj(q)&&typeof q.id==='string'&&typeof q.question==='string'&&Array.isArray(q.lectureIds)&&q.lectureIds.every(id=>typeof id==='string')&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=8&&q.options.every(s=>typeof s==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length&&typeof q.explanation==='string'&&Array.isArray(q.reasons)&&q.reasons.length===q.options.length;
 const run=x=>obj(x)&&Array.isArray(x.questions)&&x.questions.length>0&&x.questions.length<=200&&x.questions.every(question)&&obj(x.answers);
 if(name==='history')return Array.isArray(v)&&v.length<=100&&v.every(x=>obj(x)&&typeof x.id==='string'&&Number.isFinite(x.correct)&&Number.isFinite(x.total));
 if(name==='wrongBank')return obj(v)&&Array.isArray(v.entries)&&v.entries.every(x=>obj(x)&&question(x.question)&&(x.choice===null||Number.isInteger(x.choice)))&&Array.isArray(v.exams)&&v.exams.every(x=>typeof x==='string');
 if(name==='mock')return run(v)&&Number.isFinite(v.deadline)&&obj(v.flags)&&typeof v.id==='string';
 if(name==='practice')return obj(v)&&(!v.set||run(v.set));
 if(name==='drafts')return obj(v)&&Object.values(v).every(x=>obj(x)&&Array.isArray(x.ids)&&Array.isArray(x.orders)&&obj(x.answers)&&obj(x.graded));
 if(name==='originals')return obj(v)&&Object.values(v).every(x=>obj(x)&&Array.isArray(x.ids)&&x.ids.length<=800&&x.ids.every(id=>typeof id==='string')&&obj(x.answers));
 if(name==='anki')return obj(v)&&obj(v.cards)&&Object.entries(v.cards).every(([k,x])=>/^[a-f0-9]{64}:\d+$/.test(k)&&obj(x)&&Number.isFinite(x.due)&&Number.isFinite(x.interval)&&Number.isFinite(x.reps)&&(!x.at||stamp(x.at)));
 if(name==='queue')return obj(v)&&obj(v.items)&&Object.values(v.items).every(x=>obj(x)&&typeof x.id==='string'&&Array.isArray(x.candidates)&&x.candidates.length<=500&&Array.isArray(x.scanned));
 if(name==='visual')return obj(v)&&obj(v.exercises)&&obj(v.results);
 return obj(v)}
 function valid(v){if(v==null)return {version:1,stores:{}};if(!object(v)||v.version!==1||!object(v.stores))throw Error('Invalid extended backup');const stores={};for(const [k,e] of Object.entries(v.stores)){if(!known(k)||!object(e)||!stamp(e.at)||!Object.hasOwn(e,'value'))throw Error('Invalid saved study data');safeTree(e.value);if(!shape(k,e.value))throw Error('Invalid '+k+' data in the backup');if(JSON.stringify(e.value).length>7000000)throw Error('Study data is too large');stores[k]={at:e.at,value:e.value}}const result={version:1,stores};if(JSON.stringify(result).length>10000000)throw Error('Invalid extended backup');return result}
 function snapshot(){const stores={};for(const [name,key] of Object.entries(byName)){const value=read(name);if(corrupt.has(key))throw Error('Saved '+name+' data is damaged. Export the damaged store before syncing.');if(value!==null||meta[name])stores[name]={at:meta[name]||'2000-01-01T00:00:00.000Z',value}}return {version:1,stores}}
 function merge(a,b){a=valid(a);b=valid(b);const stores={...a.stores};
 function byTime(x,y,f='at'){return (Date.parse(y?.[f])||0)>(Date.parse(x?.[f])||0)?y:x}
 function union(xs,ys,key,f){const m=new Map();for(const v of [...(xs||[]),...(ys||[])]){if(v&&v[key])m.set(v[key],m.has(v[key])?byTime(m.get(v[key]),v,f):v)}return [...m.values()]}
 for(const [k,v] of Object.entries(b.stores)){const old=stores[k];if(!old){stores[k]=v;continue}const recent=Date.parse(v.at)>Date.parse(old.at)?v:old,older=recent===v?old:v;let value=recent.value;if(old.value&&v.value){
 if(k==='options'){value={...older.value,...recent.value};for(const field of ['mistakes','repairs','reading']){const x=older.value[field],y=recent.value[field];if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y)){value[field]=field==='reading'&&!Object.keys(y).length?{}:{...x,...y};if(field==='repairs')for(const [id,r] of Object.entries(x))if(y[id]&&Date.parse(r?.at)>Date.parse(y[id]?.at))value[field][id]=r}}if(old.value.practical||v.value.practical)value.practical=LabCore.merge(old.value.practical,v.value.practical);if(old.value.anatomy||v.value.anatomy)value.anatomy={...older.value.anatomy,...recent.value.anatomy,attempts:union(old.value.anatomy?.attempts,v.value.anatomy?.attempts,'id','at').sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-500)};if(old.value.answerReceipts||v.value.answerReceipts){const receipts=union(old.value.answerReceipts,v.value.answerReceipts,'id','at').sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-30);while(receipts.length>1&&JSON.stringify(receipts).length>1800000)receipts.shift();value.answerReceipts=receipts}if(old.value.retentionAttempts||v.value.retentionAttempts)value.retentionAttempts=union(old.value.retentionAttempts,v.value.retentionAttempts,'id','at').sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-600);for(const field of ['grades','customCountdowns'])if(old.value[field]||v.value[field])value[field]=union(old.value[field],v.value[field],'id','updatedAt');if(typeof window!=='undefined'&&typeof window.mergePhase2Options==='function')value=window.mergePhase2Options(older.value,recent.value,value)}
 else if(k==='wrongBank'){const x=old.value,y=v.value,clearedAt=(Date.parse(y.clearedAt)||0)>(Date.parse(x.clearedAt)||0)?y.clearedAt:x.clearedAt;const unansweredClearedAt=(Date.parse(y.unansweredClearedAt)||0)>(Date.parse(x.unansweredClearedAt)||0)?y.unansweredClearedAt:x.unansweredClearedAt;const all=new Map();for(const e of [...(x.entries||[]),...(y.entries||[])]){if(!e?.question?.id||clearedAt&&stamp(clearedAt)&&(!stamp(e.missedAt)||Date.parse(e.missedAt)<=Date.parse(clearedAt)))continue;if(!Number.isInteger(e.choice)&&unansweredClearedAt&&(!Number.isFinite(Date.parse(e.missedAt))||Date.parse(e.missedAt)<=Date.parse(unansweredClearedAt)))continue;const prev=all.get(e.question.id);const newest=prev?byTime(prev,e,'missedAt'):e;const review=[prev,e].filter(x=>x?.missedAt===newest.missedAt&&x?.review&&Number.isFinite(Date.parse(x.review.at))&&Date.parse(x.review.at)>=Date.parse(newest.missedAt)).sort((a,b)=>Date.parse(b.review.at)-Date.parse(a.review.at))[0]?.review;all.set(e.question.id,review?{...newest,review}:newest)}value={entries:[...all.values()],exams:[...new Set([...(x.exams||[]),...(y.exams||[])])],...(clearedAt?{clearedAt}:{}),...(unansweredClearedAt?{unansweredClearedAt}:{})}}
 else if(k==='history')value=union(old.value,v.value,'id','finishedAt').filter(e=>Number.isFinite(e.total)&&e.total>=0&&Number.isFinite(e.correct)&&e.correct>=0&&e.correct<=e.total).sort((x,y)=>Date.parse(x.finishedAt)-Date.parse(y.finishedAt)).slice(-100);
 else if(k==='drafts'||k==='originals'){value={...older.value};for(const [id,item] of Object.entries(recent.value)){const prev=value[id];if(!prev){value[id]=item;continue}const sameOriginal=k==='originals'&&stamp(prev.startedAt)&&prev.startedAt===item.startedAt;if(sameOriginal&&!!prev.finishedAt!==!!item.finishedAt)value[id]=prev.finishedAt?prev:item;else value[id]=byTime(prev,item,'updatedAt')}}
 else if(k==='anki'){const cards={...older.value.cards};for(const [id,c] of Object.entries(recent.value.cards||{}))cards[id]=cards[id]?byTime(cards[id],c):c;value={cards,session:recent.value.session}}
 else if(k==='queue'){const items={...older.value.items};for(const [id,item] of Object.entries(recent.value.items||{})){const prev=items[id];items[id]=prev?{...prev,...item,candidates:union(prev.candidates,item.candidates,'id','updatedAt')}:item}value={items}}
 else if(k==='visual'){const results={...older.value.results};for(const [id,row] of Object.entries(recent.value.results))results[id]=results[id]?byTime(results[id],row):row;value={exercises:{...older.value.exercises,...recent.value.exercises},results}}
 else if(k==='mock'&&old.value.id===v.value.id){if(!!old.value.finishedAt!==!!v.value.finishedAt)value=old.value.finishedAt?old.value:v.value;else if(!recent.value.finishedAt)value={...older.value,...recent.value,answers:{...older.value.answers,...recent.value.answers},flags:{...older.value.flags,...recent.value.flags}};}
 }stores[k]={at:recent.at,value}}return {version:1,stores}}
 function apply(v,{mergeMissing=true}={}){v=valid(v);const next=mergeMissing?{version:1,stores:{...snapshot().stores,...v.stores}}:v,newMeta={...meta},entries=Object.entries(next.stores).map(([k,e])=>{newMeta[k]=e.at;return [byName[k],e.value===null?null:JSON.stringify(e.value)]});entries.push([metaKey,JSON.stringify(newMeta)]);const oldEntries=entries.map(([k])=>[k,localStorage.getItem(k)]);muted=true;try{if(typeof window!=='undefined'&&window.ReviewDevice?.stageBatch)window.ReviewDevice.stageBatch(entries);else{try{for(const [k,value] of entries)value===null?rawRemove.call(localStorage,k):rawSet.call(localStorage,k,value)}catch(e){for(const [k,value] of oldEntries)try{value===null?rawRemove.call(localStorage,k):rawSet.call(localStorage,k,value)}catch{}throw Error('Restore did not finish. Keep both recovery copies and retry.')}}meta=newMeta;for(const [k]of entries)corrupt.delete(k)}finally{muted=false}window.dispatchEvent(new CustomEvent('study-vault-restored'))}
 function damagedCopies(){return Object.fromEntries([...corrupt].map(key=>[key,localStorage.getItem(key)]))}
 function inspectDamaged(){
  for(const name of Object.keys(byName))read(name);
  return Object.entries(byName).filter(([,key])=>corrupt.has(key)).map(([name,key])=>({name,raw:localStorage.getItem(key)}));
 }
 const resetting=new Set();
 async function resetDamaged(name,expectedRaw){
  if(!known(name)||resetting.has(name))throw Error('Choose one damaged store.');
  const key=byName[name],accountKey=prefix+'-account',account=localStorage.getItem(accountKey),device=window.ReviewDevice;
  if(!account||!device?.available||!device.backup||!device.stageBatch||!device.flush)throw Error('Verified device recovery storage is unavailable. Download the damaged copy and reconnect; nothing was reset.');
  const unchanged=()=>localStorage.getItem(accountKey)===account&&corrupt.has(key)&&typeof expectedRaw==='string'&&localStorage.getItem(key)===expectedRaw;
  if(!unchanged())throw Error('The damaged data has changed. Inspect it again before resetting.');
  resetting.add(name);
  try{
   // Backup key is scoped to this account and store, separate from ordinary full-progress recovery.
   const at=new Date().toISOString(),backupKey=account+'|damaged:'+name+':'+crypto.randomUUID();
   await device.backup(backupKey,JSON.stringify({version:1,name,at,raw:expectedRaw}));
   if(!unchanged())throw Error('Account or damaged data changed. Nothing was reset.');
   const oldMeta=localStorage.getItem(metaKey),nextMeta={...meta,[name]:at};
   try{
    device.stageBatch([[key,null],[metaKey,JSON.stringify(nextMeta)]]);
    await device.flush();
    if(localStorage.getItem(accountKey)!==account)throw Error('Account changed.');
    if(localStorage.getItem(key)!==null||localStorage.getItem(metaKey)!==JSON.stringify(nextMeta))throw Error('Reset could not be verified.');
   }catch(error){
    if(localStorage.getItem(accountKey)===account){
     // Retain the corrupted bytes and previous metadata on any write failure.
     try{device.stageBatch([[key,expectedRaw],[metaKey,oldMeta]]);await device.flush()}catch{}
     corrupt.add(key);
    }
    throw Error('Reset was not confirmed. The verified damaged copy is retained; reconnect and retry.');
   }
   meta=nextMeta;corrupt.delete(key);
   if(typeof scheduleSync==='function')scheduleSync();
   return true;
  }finally{resetting.delete(name)}
 }
 return {read,set,valid,snapshot,apply,merge,damagedCopies,inspectDamaged,resetDamaged};
})();

/* A private, opt-in recovery surface. Raw content is never inserted as HTML or sent to telemetry. */
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const label={wrongBank:'Wrong bank',history:'Mock history',mock:'Current mock',originals:'Original exam runs',drafts:'Lesson drafts',resume:'Study resume',practice:'Practice sets',queue:'Upload review inbox',visual:'Visual recall',anki:'Anki progress',options:'Study options and additional study history'};
 let panel,inspecting=false;
 function refreshDamagedPanel(){
  const frame=document.querySelector('#siteAdmin .admin-frame');
  if(!frame||inspecting)return;
  inspecting=true;
  try{
   const rows=StudyVault.inspectDamaged();
   if(!panel){panel=document.createElement('section');panel.className='panel';panel.id='damagedStoreRepair';frame.append(panel)}
   panel.replaceChildren();
   const h=document.createElement('h3');h.textContent='Inspect & repair damaged study stores';panel.append(h);
   if(!rows.length){const p=document.createElement('p');p.textContent='No unreadable companion stores detected.';panel.append(p);return}
   const note=document.createElement('p');note.textContent='Download the damaged data first. Reset affects only the selected store; its contents may be lost on synced devices after cloud reconciliation. A separate verified device recovery copy is required.';panel.append(note);
   for(const row of rows){
    const box=document.createElement('details'),summary=document.createElement('summary');summary.textContent=label[row.name]||row.name;box.append(summary);
    const preview=document.createElement('textarea');preview.readOnly=true;preview.rows=6;preview.setAttribute('aria-label','Damaged data preview');preview.value=String(row.raw).slice(0,16000);box.append(preview);
    if(String(row.raw).length>16000){const p=document.createElement('p');p.textContent='Preview limited to 16,000 characters; export contains the complete damaged data.';box.append(p)}
    const download=document.createElement('button');download.type='button';download.textContent='Export damaged store';
    const consent=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.disabled=true;consent.append(check,document.createTextNode(' I exported the damaged data and understand this store may be cleared from cloud sync.'));
    const reset=document.createElement('button');reset.type='button';reset.textContent='Reset only this store and reload';reset.disabled=true;
    const status=document.createElement('p');status.setAttribute('role','status');
    download.onclick=()=>{
     const url=URL.createObjectURL(new Blob([row.raw],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='review-studio-damaged-'+row.name+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);check.disabled=false;
    };
    check.onchange=()=>reset.disabled=!check.checked;
    reset.onclick=async()=>{
     if(!check.checked)return;reset.disabled=true;check.disabled=true;download.disabled=true;status.textContent='Verifying a private device recovery copy…';
     try{await StudyVault.resetDamaged(row.name,row.raw);status.textContent='Selected store reset. Reloading…';location.reload()}
     catch(error){status.textContent=error.message;download.disabled=false;check.disabled=false;reset.disabled=!check.checked}
    };
    box.append(download,consent,reset,status);panel.append(box);
   }
  }finally{inspecting=false}
 }
 document.addEventListener('click',event=>{if(event.target.closest?.('#openSiteAdmin'))refreshDamagedPanel()});
 window.addEventListener('study-vault-corrupt',()=>{if(document.querySelector('#siteAdmin')?.open)refreshDamagedPanel()});
}
