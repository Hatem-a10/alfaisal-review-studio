/* Load deck management after the app opens, or immediately when requested. */
let phase3AnkiLoading;
window.loadAnki=()=>phase3AnkiLoading??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/anki.js?v=150';script.onload=resolve;script.onerror=()=>{phase3AnkiLoading=null;reject(Error('Could not open Anki. Reconnect and try again.'))};document.head.append(script)});
function ankiPage(){window.loadAnki().catch(error=>{const target=document.getElementById('ankiOpening');if(target)target.textContent=error.message});return '<section class="panel" id="ankiOpening" role="status">Opening your decks…</section>'}
if('requestIdleCallback'in window)requestIdleCallback(()=>window.loadAnki().catch(()=>{}),{timeout:4000});else setTimeout(()=>window.loadAnki().catch(()=>{}),3000);
