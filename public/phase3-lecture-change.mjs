// A5-230: compare lightweight lecture identity fields without allocating a
// mapped array and a potentially megabyte-sized JSON string for every render.
// For nonstandard field types, fall back to exact legacy JSON fingerprint semantics.
export function createLectureChangeDetector(){
 let previous=null,serialized=null;
 return items=>{
  const rows=Array.isArray(items)?items:[];
  let uncommon=false,changed=previous===null||previous.length!==rows.length;
  for(let i=0;i<rows.length;i++){
   const item=rows[i],id=item?.id??null,title=item?.title??null;
   if((id!==undefined&&id!==null&&typeof id!=='string')||(title!==undefined&&title!==null&&typeof title!=='string'))uncommon=true;
   if(!changed&&(previous[i][0]!==id||previous[i][1]!==title))changed=true;
  }
  if(uncommon){
   const next=JSON.stringify(rows.map(x=>[x?.id,x?.title]));
   changed=serialized===null?(previous===null||changed):serialized!==next;
   serialized=next;
  }else if(previous!==null&&serialized!==null){
   // Transition from exotic to ordinary catalog values needs an exact baseline check.
   const next=JSON.stringify(rows.map(x=>[x?.id,x?.title]));
   changed=serialized!==next;serialized=null;
  }
  if(changed||previous===null)previous=rows.map(x=>[x?.id??null,x?.title??null]);
  return changed;
 };
}
