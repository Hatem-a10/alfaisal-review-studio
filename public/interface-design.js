/* Appearance is local to this browser; switching never touches study records. */
(()=>{
  const root=document.documentElement;
  const select=document.getElementById('interfaceDesign');
  if(!select)return;
  select.value=root.dataset.ui==='classic'?'classic':'modern';
  select.addEventListener('change',()=>{
    const value=select.value==='classic'?'classic':'modern';
    root.dataset.ui=value;
    try{localStorage.setItem('alfaisal-review-interface',value)}catch(_){}
  });
})();
