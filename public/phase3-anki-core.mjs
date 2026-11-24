export function reorderRemaining(queue,index,mode,original,random=Math.random){
 const prefix=queue.slice(0,index+1),rest=queue.slice(index+1);
 if(mode==='shuffle'){for(let i=rest.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}}
 else {const ranks=new Map(original.map((c,i)=>[c.id,i]));rest.sort((a,b)=>(ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity))}
 return prefix.concat(rest)
}
export function validBackground(file){return !!file&&['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)&&file.size>0&&file.size<=8*1024*1024}
export function typingTarget(el){return !!el&&(!!el.isContentEditable||!!el.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))}
export function backgroundStore(account,op,value){if(!account)return Promise.reject(Error('Sign in before saving a background on this device.'));return new Promise((resolve,reject)=>{const r=indexedDB.open('review-studio-anki-backgrounds',1);r.onupgradeneeded=()=>r.result.createObjectStore('backgrounds');r.onerror=()=>reject(Error('Device background storage unavailable'));r.onblocked=()=>reject(Error('Close other study tabs and retry background storage.'));r.onsuccess=()=>{const db=r.result,tx=db.transaction('backgrounds',op==='get'?'readonly':'readwrite'),s=tx.objectStore('backgrounds'),q=op==='get'?s.get(account):op==='put'?s.put(value,account):s.delete(account);let out;q.onsuccess=()=>out=q.result;tx.oncomplete=()=>{db.close();resolve(out)};tx.onerror=tx.onabort=()=>{db.close();reject(Error('Could not save background on this device'))}}})}
export function localDeckSelection(records,account,legacyOwner){
 if(!account)return [];
 const owned=records.filter(d=>d.accountKey===account);
 return records.filter(d=>d.accountKey===account||(!d.accountKey&&legacyOwner===account&&!owned.some(x=>x.deckId===d.id))).map(d=>({...d,storageId:d.id,id:d.deckId||d.id}));
}
export function localDeckRecord(deck){if(!deck.accountKey)throw Error('Account required');return {...deck,id:deck.accountKey+'::'+deck.id,deckId:deck.id}}
