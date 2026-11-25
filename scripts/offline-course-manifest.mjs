import {readFileSync} from 'node:fs';import path from 'node:path';
import {activeBookletPaths} from '../public/active-booklet-core.mjs';
import {MAX_CACHE_BYTES,offlineCoursePath} from '../public/phase3-cache-policy.mjs';
export function courseOfflineManifest(root){
 const read=p=>JSON.parse(readFileSync(path.join(root,p),'utf8')),mol=read('public/mol-study-assets.json'),active=read('lib/active-booklet-assets.json');
 const source={REN:[...read('public/renal-materials.json'),...read('lib/renal-assessment-assets.json')],MOL:[...mol.sources,mol.assessments]};
 const result={courses:{},excluded:{}};
 for(const [course,rows] of Object.entries(source)){
  const booklet=active.filter(r=>offlineCoursePath(course,'/api/site-assets/'+r.path)&&(
   '/api/site-assets/'+r.path===activeBookletPaths[course]||r.path.endsWith('/booklet-reviewed-v2.json')||r.path.includes('/booklet-context/')));
  const candidates=[...booklet,...rows];
  const seen=new Set();let bytes=0,excluded=0;const entries=[];
  for(const r of candidates){const p='/api/site-assets/'+r.path;if(seen.has(p))continue;seen.add(p);if(!offlineCoursePath(course,p)||!Number.isSafeInteger(r.size)||r.size<=0||r.size>MAX_CACHE_BYTES||!(/^[0-9a-f]{64}$/.test(r.sha))||bytes+r.size>100000000){excluded++;continue}entries.push({path:p,size:r.size,sha:r.sha});bytes+=r.size}
  result.courses[course]=entries;result.excluded[course]=excluded;
 }
 return result;
}
