// A5-108: privacy-minimal, page-local resource timing for major authenticated API
// categories. Never retain URLs, queries, headers, status, or account identifiers.
import {createNavigationMetrics} from './phase3-navigation-metrics.mjs';
const ROUTES=new Map([['/api/progress','api-progress'],['/api/materials','api-materials'],['/api/decks','api-decks'],['/api/account-key','api-account']]);
export function createApiTimingMetrics({origin,maxPerEndpoint=100}={}){
 const metrics=createNavigationMetrics({maxPerView:maxPerEndpoint,maxViews:8});
 function record(entry){
  if(typeof entry?.name!=='string'||!Number.isFinite(entry.duration)||entry.duration<0)return false;
  let path;
  try{const url=new URL(entry.name,origin);if(url.origin!==origin)return false;path=url.pathname}catch{return false}
  const key=ROUTES.get(path);return key?metrics.record(key,entry.duration):false;
 }
 return {record,summary:metrics.summary};
}
