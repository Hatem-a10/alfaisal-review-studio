export function reorderRemaining(queue,index,mode,original,random=Math.random){
 const prefix=queue.slice(0,index+1),rest=queue.slice(index+1);
 if(mode==='shuffle'){for(let i=rest.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}}
 else {const ranks=new Map(original.map((c,i)=>[c.id,i]));rest.sort((a,b)=>(ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity))}
 return prefix.concat(rest)
}
export function validBackground(file){return !!file&&['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)&&file.size>0&&file.size<=8*1024*1024}
export function typingTarget(el){return !!el&&(!!el.isContentEditable||!!el.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))}
export function backgroundStore(account,op,value){if(!account)return Promise.reject(Error('Sign in before saving a background on this device.'));if(!['get','put','delete'].includes(op))return Promise.reject(Error('Invalid background operation'));return new Promise((resolve,reject)=>{let settled=false;const fail=message=>{settled=true;reject(Error(message))},r=indexedDB.open('review-studio-anki-backgrounds',1);r.onupgradeneeded=()=>r.result.createObjectStore('backgrounds');r.onerror=()=>fail('Device background storage unavailable');r.onblocked=()=>fail('Close other study tabs and retry background storage');r.onsuccess=()=>{const db=r.result;if(settled){db.close();return}try{const tx=db.transaction('backgrounds',op==='get'?'readonly':'readwrite'),s=tx.objectStore('backgrounds'),q=op==='get'?s.get(account):op==='put'?s.put(value,account):s.delete(account);let out;q.onsuccess=()=>out=q.result;tx.oncomplete=()=>{db.close();resolve(out)};tx.onerror=tx.onabort=()=>{db.close();fail('Could not save background on this device')}}catch(e){db.close();fail('Device background storage unavailable')}}})}
export function localDeckSelection(records,account,legacyOwner){
 if(!account)return [];
 const owned=new Set(records.filter(d=>d?.accountKey===account).map(d=>d.deckId||d.id));
 return records.filter(d=>d?.id&&(d.accountKey===account||(!d.accountKey&&legacyOwner===account&&!owned.has(d.id)))).map(d=>({...d,storageId:d.id,id:d.deckId||d.id}));
}
export function localDeckRecord(deck){if(!deck.accountKey)throw Error('Account required');return {...deck,id:deck.accountKey+'::'+deck.id,deckId:deck.id}}

export function updateCardReview(progress,key,action,original,at){
 if(typeof key!=='string'||!key.includes(':')||!['suspend','resume','reset'].includes(action)||!Number.isFinite(Date.parse(at)))throw Error('Invalid card update.');
 const valid=x=>x&&[x.interval,x.due,x.reps].every(Number.isFinite)&&x.interval>=0&&x.reps>=0;
 if(!valid(original))throw Error('Imported schedule is unavailable.');
 const cards={...(progress?.cards||{})},prior=valid(cards[key])?cards[key]:original;
 cards[key]=action==='reset'?{...original,suspended:false,reset:true,at}:({...prior,suspended:action==='suspend',at});
 return {...progress,cards};
}
