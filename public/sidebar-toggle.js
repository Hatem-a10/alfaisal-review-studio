(()=>{
  const button=document.getElementById('sidebarToggle');
  const sidebar=document.getElementById('mainSidebar');
  if(!button||!sidebar)return;
  const key='alfaisal-review-sidebar-hidden';
  let hidden=false;
  try{hidden=localStorage.getItem(key)==='1'}catch(_){}
  function render(){
    document.body.classList.toggle('sidebar-hidden',hidden);
    button.setAttribute('aria-expanded',String(!hidden));
    const label=hidden?'Show sidebar':'Hide sidebar';
    button.setAttribute('aria-label',label);
    button.title=label;
  }
  button.addEventListener('click',()=>{hidden=!hidden;try{localStorage.setItem(key,hidden?'1':'0')}catch(_){}render()});
  render();
})();
