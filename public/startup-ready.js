'use strict';
(()=>{
 function ready(){const shell=document.getElementById('appBoot');if(!window.reviewBootFailed&&document.getElementById('hubTopControls')&&typeof render==='function'){try{window.reviewBootRender=true;render()}catch(e){failed();console.error('Study interface initialization failed',e);return}finally{window.reviewBootRender=false}document.documentElement.dataset.boot='ready';shell.hidden=true;performance.mark('studio-ready');window.dispatchEvent(new Event('studio-ready'))}else failed()}
 function failed(){const text=document.getElementById('appBootText'),retry=document.getElementById('retryStartup');if(text)text.textContent='Could not finish loading. Your saved progress is still on this device.';if(retry)retry.hidden=false}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
