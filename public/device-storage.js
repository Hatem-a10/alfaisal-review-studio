/* Hydrate durable device data before executing the app's classic scripts. */
(async()=>{
 // Bind the device to the verified new account before any personal state loads.
 // Offline study stays available to the last signed-in account; logout locks it.
 const managedAccounts=window.REVIEW_STUDIO_FRESH_ACCOUNTS===true;
 let verifiedAccount=null,offlineAccount=null;
 if(managedAccounts){
  if(navigator.onLine===false){
   offlineAccount=localStorage.getItem('alfaisal-review-studio-v1-account');
   if(localStorage.getItem('review-studio-managed-signed-out')==='1'||!/^[a-f0-9]{64}$/.test(offlineAccount||'')){
    throw Error('Reconnect and sign in to open your study space.');
   }
  }else{
   try{
    const r=await fetch('/api/account-key',{cache:'no-store',credentials:'same-origin'});
    if(r.status===401||r.status===403){location.replace('/auth/sign-in');return}
    if(!r.ok)throw Error('Account unavailable');
    const value=await r.json();if(!/^[a-f0-9]{64}$/.test(value.accountKey))throw Error('Invalid account');
    verifiedAccount=value.accountKey;
   }catch{
    throw Error('Could not verify your sign-in. Reconnect and retry. Your progress is retained.');
   }
   try{localStorage.removeItem('review-studio-managed-signed-out')}catch{}
  }
 }
 const prefix='alfaisal-review-studio-v1',storage=localStorage,rawGet=Storage.prototype.getItem,rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem,accountKey=prefix+'-account';
 const managed=k=>k===prefix||k.startsWith(prefix+'-')&&k!==accountKey||k.startsWith('review-studio-account-copy:');
 const cache=new Map(),pending=new Map();let account=rawGet.call(storage,accountKey)||'guest',db,chain=Promise.resolve(),lastError;
 const notify=error=>{lastError=error;window.dispatchEvent(new CustomEvent('device-storage-error',{detail:{message:'Device saving needs attention. Keep this tab open and reconnect to sync.'}}))};
 const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('review-studio-device',1);r.onupgradeneeded=()=>{r.result.createObjectStore('values');r.result.createObjectStore('meta');r.result.createObjectStore('recovery')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const tx=(store,mode,action)=>new Promise((resolve,reject)=>{const t=db.transaction(store,mode),r=action(t.objectStore(store));let value;r.onsuccess=()=>value=r.result;t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Device write interrupted'))});
 const id=k=>account+'|'+k;
 async function hydrate(){cache.clear();const [keys,values]=await Promise.all([tx('values','readonly',s=>s.getAllKeys()),tx('values','readonly',s=>s.getAll())]);keys.forEach((key,i)=>{if(String(key).startsWith(account+'|'))cache.set(String(key).slice(account.length+1),values[i])});if(!await tx('meta','readonly',s=>s.get('initialized:'+account))){for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&managed(key)&&!cache.has(key))cache.set(key,rawGet.call(storage,key))}for(const[k,v]of cache)await tx('values','readwrite',s=>s.put(v,id(k)));await tx('meta','readwrite',s=>s.put(true,'initialized:'+account))}}
 function queue(k,v){if(!db)return;pending.set(id(k),v);chain=chain.catch(()=>{}).then(async()=>{const items=[...pending];if(!items.length)return;await new Promise((resolve,reject)=>{const t=db.transaction('values','readwrite'),s=t.objectStore('values');for(const[key,value]of items)value===null?s.delete(key):s.put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});for(const[key,value]of items)if(pending.get(key)===value)pending.delete(key);lastError=null}).catch(notify)}
 try{db=await open();account=await tx('meta','readonly',s=>s.get('active'))||account}catch(error){notify(error);db=null}
 if(managedAccounts&&!db)throw Error('Secure device storage is unavailable. Enable device storage and retry; your saved copies are retained.');
 if(offlineAccount&&(account!==offlineAccount||!await tx('meta','readonly',s=>s.get('initialized:'+account)))){
  throw Error('Reconnect and sign in to open your study space.');
 }
 try{
  if(verifiedAccount){
   account=verifiedAccount;
   await tx('meta','readwrite',s=>s.put(account,'active'));
   await tx('meta','readwrite',s=>s.put(true,'initialized:'+account));
   try{rawSet.call(storage,accountKey,account)}catch{}
  }
  if(db)await hydrate();
 }catch(error){
  notify(error);db=null;
  if(managedAccounts)throw Error('Secure device storage is unavailable. Enable device storage and retry; your saved copies are retained.');
 }
 if(db){Storage.prototype.getItem=function(key){key=String(key);if(this===storage){if(key===accountKey)return account==='guest'?null:account;if(managed(key))return cache.has(key)?cache.get(key):null}return rawGet.call(this,key)};
 Storage.prototype.setItem=function(key,value){key=String(key);value=String(value);if(this===storage&&key===accountKey){if(account==='guest'&&value){account=value;for(const[k,v]of cache)queue(k,v)}chain=chain.then(()=>tx('meta','readwrite',s=>s.put(value,'active'))).catch(notify);try{rawSet.call(this,key,value)}catch{}return}if(this===storage&&managed(key)){cache.set(key,value);queue(key,value);return}return rawSet.call(this,key,value)};
 Storage.prototype.removeItem=function(key){key=String(key);if(this===storage&&managed(key)){cache.delete(key);queue(key,null);try{rawRemove.call(this,key)}catch{}return}return rawRemove.call(this,key)};}
 window.ReviewDevice={get available(){return !!db},keys:()=>[...new Set([...Object.keys(storage),...cache.keys()])],async flush(){await chain;if(lastError||pending.size)throw Error('Device database could not save your recovery copy. Keep this tab open and retry.');},async backup(key,value){if(!db)throw Error('Device database unavailable. Your progress is retained; keep this tab open and reconnect.');await this.flush();await tx('recovery','readwrite',s=>s.put(value,key));const check=await tx('recovery','readonly',s=>s.get(key));if(check!==value)throw Error('Recovery copy verification failed.');},async confirmed(){if(!db)return;await this.flush();for(const key of this.keys())if(managed(key)&&cache.has(key)&&rawGet.call(storage,key)!==null){const verified=await tx('values','readonly',s=>s.get(id(key)));if(verified===cache.get(key))try{rawRemove.call(storage,key)}catch{}}},async switchAccount(key){if(!db)throw Error('Device database unavailable; reconnect before switching accounts.');await this.flush();account=key;await tx('meta','readwrite',s=>s.put(key,'active'));await tx('meta','readwrite',s=>s.put(true,'initialized:'+key));try{rawSet.call(storage,accountKey,key)}catch{}await hydrate();location.reload()}};
 for(const tag of document.querySelectorAll('script[type="application/x-review-studio"][data-src]'))await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=tag.dataset.src;script.onload=resolve;script.onerror=()=>reject(Error('Could not load the study app.'));document.head.append(script)});
})().catch(error=>{window.reviewBootFailed=true;const text=document.getElementById('appBootText');if(text)text.textContent=error.message;document.getElementById('retryStartup')?.removeAttribute('hidden')});
