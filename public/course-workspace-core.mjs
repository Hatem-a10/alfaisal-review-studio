import {courses} from './course-registry.mjs';

export const archiveViews=['learning','booklet','practice','labs','ospe','library'];
export const renalViews=['dashboard',...archiveViews];
const bySlug=new Map(Object.entries(courses).map(([id,course])=>[course.slug,[id,course]]));

export function workspaceRoute(hash){
 if(typeof hash!=='string'||!hash.trim())return null;
 const [slug,view,...rest]=hash.replace(/^#/,'').split('/');
 const entry=bySlug.get(slug);
 if(rest.length||!entry)return null;
 const [course,config]=entry;
 if(config.archived&&view===undefined)return {course,view:'index'};
 if(archiveViews.includes(view)&&!(view==='ospe'&&config.noOspe)||view==='dashboard'&&course==='REN')return {course,view};
 return null;
}
export function renalSessions(events, matches, kinds){
 const seen=new Set();
 if(!Array.isArray(events)||!Array.isArray(kinds)||typeof matches!=='function')return [];
 return events.filter(event=>{
  if(!event||event.course!=='REN'||typeof event.title!=='string'||!event.title.trim()||!kinds.includes(event.kind)||!matches(event))return false;
  const key=JSON.stringify([event.title,event.detail||'']);
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
}


export function isCvpStudyItem(item){
 if(!item)return false;
 return [item.course,item.scope,item.id,item.title,item.name,item.displayName,item.lectureId,item.source,item.url,
  ...(Array.isArray(item.lectureIds)?item.lectureIds:[item.lectureIds]),...(Array.isArray(item.references)?item.references:[item.references]).map(ref=>typeof ref==='string'?ref:ref?.source)]
  .some(label=>typeof label==='string'&&/(?:^|[^a-z0-9])cvp(?:[-_ ]?112|19|[-_]|\b)/i.test(label));
}
