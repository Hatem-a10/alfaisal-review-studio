'use strict';
(()=>{
 async function ready(){try{await import("/phase1-runtime.mjs?v=1501")}catch(e){failed();console.error("Phase 1 initialization failed",e);return}const shell=document.getElementById('appBoot');if(!window.reviewBootFailed&&document.getElementById('hubTopControls')&&typeof render==='function'){try{window.reviewBootRender=true;render()}catch(e){failed();console.error('Study interface initialization failed',e);return}finally{window.reviewBootRender=false}document.documentElement.dataset.boot='ready';shell.hidden=true;performance.mark('studio-ready');if(view==='dashboard')requestAnimationFrame(()=>{if(view==='dashboard')performance.mark('studio-home-usable')});window.dispatchEvent(new Event('studio-ready'));import('/study-next.mjs?v=4').catch(e=>console.error('Study tools could not load',e))}else failed()}
 function failed(){
  // Reload on our own a few times (2s, 4s, 8s) before asking; progress stays on the device either way.
  const text=document.getElementById('appBootText'),retry=document.getElementById('retryStartup');let n=0;
  try{const v=JSON.parse(sessionStorage.getItem('review-startup-retries')||'{}');n=Date.now()-(v.at||0)<60000?v.n||0:0;if(n<3){sessionStorage.setItem('review-startup-retries',JSON.stringify({n:n+1,at:Date.now()}));if(text)text.textContent='Still loading…';setTimeout(()=>location.reload(),2000*2**n);return}}catch{}
  if(text)text.textContent='Could not finish loading. Your saved progress is still on this device.';if(retry)retry.hidden=false}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
