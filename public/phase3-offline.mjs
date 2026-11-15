import {validAccount} from './phase3-cache-policy.mjs';
// The saved key originates in the authenticated progress response; private caches remain per account.
export async function installOffline(){
 if(!('serviceWorker' in navigator))return;
 const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&new URL(location.href).searchParams.get('offline-test')==='1';
 if(!local){try{const response=await fetch('/site-release.json',{cache:'no-store'}),release=await response.json();if(!/^v1\.(?:5[0-9]|[6-9][0-9]|[0-9]{3,})$/.test(release.displayVersion)||release.status==='local-draft')return}catch{return}}
 const registration=await navigator.serviceWorker.register('/review-sw.js',{type:'module'});
 const bind=async()=>{
  const worker=navigator.serviceWorker.controller||registration.active;if(!worker)return;
  let key=localStorage.getItem('alfaisal-review-studio-v1-account');
  if(navigator.onLine!==false){try{const response=await fetch('/api/account-key',{cache:'no-store',credentials:'same-origin'});if(!response.ok)key=null;else{const data=await response.json();if(data.accountKey!==key)key=null}}catch{key=null}}
  worker.postMessage({type:'ACCOUNT',key:validAccount(key)?key:null});
 };
 await navigator.serviceWorker.ready;await bind();
 navigator.serviceWorker.addEventListener('controllerchange',bind);
 window.addEventListener('focus',bind);window.addEventListener('online',bind);window.addEventListener('studio-ready',bind);
 // The existing app online handler invokes its guarded syncCloud(true).
}
