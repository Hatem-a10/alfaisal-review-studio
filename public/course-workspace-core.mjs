import {courses} from './course-registry.mjs';

export const archiveViews=['learning','booklet','practice','labs','ospe','library'];
export const renalViews=['dashboard',...archiveViews];
const bySlug=new Map(Object.entries(courses).map(([id,course])=>[course.slug,[id,course]]));

export function workspaceRoute(hash){
 const [slug,view,...rest]=hash.replace(/^#/,'').split('/');
 const entry=bySlug.get(slug);
 if(rest.length||!entry)return null;
 const [course,config]=entry;
 if(config.archived&&!view)return {course,view:'index'};
 if(archiveViews.includes(view)&&!(view==='ospe'&&config.noOspe)||view==='dashboard'&&course==='REN')return {course,view};
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


export function isCvpStudyItem(item){
 if(!item)return false;
 return [item.course,item.scope,item.id,item.title,item.name,item.displayName,item.lectureId,item.source,item.url,
  ...(item.lectureIds||[]),...(item.references||[]).map(ref=>ref?.source)]
  .some(label=>typeof label==='string'&&/(?:^|[^a-z0-9])cvp(?:[-_ ]?112|19|[-_]|\b)/i.test(label));
}
