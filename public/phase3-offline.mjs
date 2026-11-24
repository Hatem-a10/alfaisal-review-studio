import {validAccount} from './phase3-cache-policy.mjs';

export function offlineReleaseEligible(release){
 const match=/^v(\d+)\.(\d{2,})$/.exec(String(release?.displayVersion||''));
 if(!match||release.status==='local-draft')return false;
 const major=Number(match[1]),minor=Number(match[2]);
 return Number.isSafeInteger(major)&&Number.isSafeInteger(minor)&&(major>1||major===1&&minor>=50);
}

// Only the most recent identity check may bind a client to a private cache.
export function createAccountBinder({getWorker,readKey,isOnline,verify}){
 let generation=0,lastBound=null;
 return async()=>{
  const run=++generation;if(!getWorker())return;
  const initial=readKey();let key=validAccount(initial)?initial:null;
  // Immediately revoke an earlier account while a different identity is being verified.
  if(lastBound&&key!==lastBound){getWorker()?.postMessage({type:'ACCOUNT',key:null});lastBound=null}
  if(key&&isOnline()){
   try{if(await verify()!==key)key=null}catch{key=null}
  }
  if(run!==generation)return;
  if(readKey()!==initial)key=null;
  const worker=getWorker();if(worker){worker.postMessage({type:'ACCOUNT',key});lastBound=key}
 };
}

// The saved key originates in the authenticated progress response; private caches remain per account.
export async function installOffline(){
 if(!('serviceWorker' in navigator))return;
 const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&new URL(location.href).searchParams.get('offline-test')==='1';
 if(!local){try{const response=await fetch('/site-release.json',{cache:'no-store'}),release=await response.json();if(!offlineReleaseEligible(release))return}catch{return}}
 const registration=await navigator.serviceWorker.register('/review-sw.js',{type:'module'});
 const accountKey='alfaisal-review-studio-v1-account',logoutKey='review-studio-managed-signed-out';
 const readKey=()=>{try{return localStorage.getItem(logoutKey)==='1'?null:localStorage.getItem(accountKey)}catch{return null}};
 const bind=createAccountBinder({
  getWorker:()=>navigator.serviceWorker.controller||registration.active,
  readKey,
  isOnline:()=>navigator.onLine!==false,
  async verify(){const response=await fetch('/api/account-key',{cache:'no-store',credentials:'same-origin'});if(!response.ok)return null;return (await response.json()).accountKey},
 });
 await navigator.serviceWorker.ready;
 navigator.serviceWorker.addEventListener('controllerchange',bind);
 window.addEventListener('focus',bind);window.addEventListener('online',bind);window.addEventListener('offline',bind);window.addEventListener('studio-ready',bind);
 window.addEventListener('storage',event=>{if(event.key===accountKey||event.key===logoutKey||event.key===null)bind()});
 await bind();
 // The existing app online handler invokes its guarded syncCloud(true).
}
