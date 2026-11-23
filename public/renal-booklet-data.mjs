let pending;

export function loadRenalBooklet(){
 return pending??=fetch('/api/site-assets/materials/ren123/interactive-booklet-v2.json').then(response=>{
  if(!response.ok)throw Error('Could not load the Renal booklet questions.');
  return response.json();
 }).then(pack=>{
  if(pack.version!==2||!pack.questions?.length)throw Error('Renal booklet data is incomplete.');
  return pack;
 }).catch(error=>{pending=null;throw error;});
}
