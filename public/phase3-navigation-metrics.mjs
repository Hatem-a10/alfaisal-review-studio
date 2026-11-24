// In-memory, privacy-minimal navigation render timings. Never stores account identifiers or sends metrics.
export function createNavigationMetrics({maxPerView=120,maxViews=24}={}){
 const samples=new Map(),validView=value=>typeof value==='string'&&/^[a-z][a-z-]{0,31}$/.test(value);
 const cap=Math.max(1,Math.min(240,Math.trunc(maxPerView)||120)),views=Math.max(1,Math.min(32,Math.trunc(maxViews)||24));
 function record(view,ms){
  if(!validView(view)||typeof ms!=='number'||!Number.isFinite(ms)||ms<0||ms>60000)return false;
  if(!samples.has(view)){if(samples.size>=views)samples.delete(samples.keys().next().value);samples.set(view,[])}
  const rows=samples.get(view);if(rows.length>=cap)rows.shift();rows.push(ms);return true;
 }
 function summary(){
  const result={};
  for(const [view,rows] of samples){if(!rows.length)continue;const sorted=rows.slice().sort((a,b)=>a-b),q=p=>Math.round(sorted[Math.ceil(p*sorted.length)-1]*100)/100;
   result[view]={count:rows.length,p50Ms:q(.5),p95Ms:q(.95),minMs:Math.round(sorted[0]*100)/100,maxMs:Math.round(sorted.at(-1)*100)/100};
  }
  return result;
 }
 return {record,summary};
}
