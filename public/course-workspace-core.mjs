export const archiveViews=['learning','booklet','practice','labs','ospe','library'];
export const renalViews=['dashboard',...archiveViews];

export function workspaceRoute(hash){
 const [course,view,...rest]=hash.replace(/^#/,'').split('/');
 if(rest.length)return null;
 if(course==='archive'&&(!view||archiveViews.includes(view)))return {course:'CVP',view:view||'index'};
 if(course==='renal'&&renalViews.includes(view))return {course:'REN',view};
 if(course==='mol'&&['learning','practice','library','labs'].includes(view))return {course:'MOL',view};
 return null;
}

export function renalSessions(events, matches, kinds){
 const seen=new Set();
 return events.filter(event=>{
  if(event.course!=='REN'||!kinds.includes(event.kind)||!matches(event))return false;
  const key=event.title+'|'+(event.detail||'');
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
}
