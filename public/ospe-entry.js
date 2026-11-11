'use strict';
(()=>{
 let ui=null,pending=null,labPending=null,failed='',labFailed='';
 const oldLearning=learning;learning=function(){return '<div class="learning-kind-switch" aria-label="Learning area"><button class="selected" data-view="learning">Lessons</button><button data-view="labs">Labs & practicals</button><button data-view="ospe">OSPE</button></div>'+oldLearning()};
 const prev=render;render=function(){if(!['ospe','labs'].includes(view))return prev();if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return;applyTheme();paintProfile();if(view==='ospe'&&ui){ui.render();return}const isLab=view==='labs',error=isLab?labFailed:failed;document.querySelector('#content').innerHTML='<section class="panel" role="status">'+(error?esc(error)+' <button data-ospe-load>Retry</button>':isLab?'Opening your lab bench…':'Opening OSPE preparation…')+'</section>';if(isLab){if(!labPending&&!labFailed)labPending=import('/labs.js?v=3').then(()=>{if(view==='labs')render()}).catch(e=>{labFailed=e.message;if(view==='labs')render()});return}if(!pending&&!failed)pending=import('/ospe.js?v=1').then(m=>m.mount()).then(v=>{ui=v;if(view==='ospe')render()}).catch(e=>{failed=e.message;if(view==='ospe')render()}).finally(()=>pending=null)};
 const oldGo=go;go=function(v){if(!['ospe','labs'].includes(v))return oldGo(v);if(v==='ospe'&&view!==v)ui?.resume();view=v;history.pushState(null,'','#'+v);render()};
 for(const event of ['popstate','hashchange'])window.addEventListener(event,()=>{if(['ospe','labs'].includes(location.hash.slice(1))){if(location.hash==='#ospe'&&view!=='ospe')ui?.resume();view=location.hash.slice(1);render()}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-ospe-load]')){failed=labFailed='';labPending=null;render()}});
 const previousActivity=HubDomain.activity;HubDomain.activity=function(records){const out=previousActivity(records);for(const a of LabCore.merge({},storeOptions().practical||{}).attempts){const day=Study.localDate(a.at);out[day]??={reviews:0,practice:0,minutes:0};out[day].practice++}return out};
 if(['ospe','labs'].includes(location.hash.slice(1)))view=location.hash.slice(1);
})();
