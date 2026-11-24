// Per-generator invocation only; preserve source order for locale-equivalent keys.
export function indexChangelog(learning,digest){
 const sources=new Map(),questions=new Map(),fallback=[];
 const add=(map,id,row)=>{if(!map.has(id))map.set(id,[]);map.get(id).push(row)};
 (learning.sources||[]).forEach((source,index)=>add(sources,source.id,{source,index}));
 learning.questions.forEach((q,index)=>{
  const ids=q.lectureIds;
  if(Array.isArray(ids)){for(const id of new Set(ids))add(questions,id,{q,index})}
  else if(ids!=null)fallback.push({q,index});
 });
 const hashes=new WeakMap(),hash=q=>{if(!hashes.has(q))hashes.set(q,digest(q));return hashes.get(q)};
 return {
  sources(ids){return [...ids].flatMap(id=>sources.get(id)||[]).sort((a,b)=>a.source.id.localeCompare(b.source.id)||a.index-b.index).map(row=>row.source)},
  questions(id){
   const direct=questions.get(id)||[],rows=fallback.length?[...direct,...fallback.filter(({q})=>q.lectureIds?.includes(id))].sort((a,b)=>a.index-b.index):direct;
   return Object.fromEntries(rows.map(({q})=>[q.id,hash(q)]).sort(([a],[b])=>a.localeCompare(b)));
  }
 };
}
