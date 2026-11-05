'use strict';
function installMobileDock(){
 const nav=document.querySelector('.ui-mobile-nav');if(!nav||nav.closest('.mobile-dock-shell'))return;
 const shell=document.createElement('div');shell.className='mobile-dock-shell';shell.setAttribute('role','group');shell.setAttribute('aria-label','Mobile navigation controls');
 const control=(direction,label)=>{const b=document.createElement('button');b.type='button';b.className='dock-scroll dock-scroll-'+direction;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="'+(direction==='left'?'m15 5-7 7 7 7':'m9 5 7 7-7 7')+'"/></svg>';b.onclick=()=>nav.scrollBy({left:(direction==='left'?-1:1)*Math.max(150,nav.clientWidth*.7),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return b};
 const left=control('left','Show earlier navigation tools'),right=control('right','Show more navigation tools');nav.before(shell);shell.append(left,nav,right);
 function update(){left.disabled=nav.scrollLeft<=2;right.disabled=nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-2}
 nav.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);new MutationObserver(()=>requestAnimationFrame(update)).observe(nav,{subtree:true,attributes:true,attributeFilter:['hidden','aria-expanded']});requestAnimationFrame(update);
}
