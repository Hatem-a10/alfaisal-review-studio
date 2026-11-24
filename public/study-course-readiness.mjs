import {courses,lectureCourses} from './course-registry.mjs';
import {workspaceRoute} from './course-workspace-core.mjs';

export const readinessSurfaces=[['learning','Lessons'],['calendar','Schedule'],['labs','Labs'],['ospe','OSPE'],['booklet','Booklet'],['practice','Previous Exams']];
export function courseInventory(course,{lessons=[],events=[],labs=[],stations=[],figures=[],sources=[],assessments=[],booklet=false}={}){
 const config=courses[course],unregistered=lessons.filter(row=>!lectureCourses.has(row.id)).map(row=>row.id);
 const missing=readinessSurfaces.filter(([view])=>view!=='calendar'&&!(view==='ospe'&&config.noOspe)&&!workspaceRoute('#'+config.slug+'/'+view)).map(([,label])=>label);
 const counts=[lessons.length,events.length,labs.length,config.noOspe?null:stations.length,Number(booklet),assessments.length];
 return {unregistered,missing,figures:[...new Set(figures)],sources:[...new Set(sources)],rows:readinessSurfaces.map(([view,label],i)=>({view,label,count:counts[i]}))};
}

export async function unavailableAssets(urls,fetcher=fetch){
 const paths=[...new Set(urls)];
 const invalid=paths.filter(url=>typeof url!=='string'||!url.startsWith('/')||url.startsWith('//')||url.includes('\\'));
 const valid=paths.filter(url=>!invalid.includes(url));
 const broken=[...invalid];
 for(let i=0;i<valid.length;i+=6){
  await Promise.all(valid.slice(i,i+6).map(async url=>{
   try{if(!(await fetcher(url,{method:'HEAD',credentials:'same-origin'})).ok)broken.push(url);}catch{broken.push(url);}
  }));
 }
 return broken;
}
