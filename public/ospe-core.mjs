export const OspeCore={
 select(stations,category='all',week='all',mock=false){return stations.filter(s=>(category==='all'||s.category===category)&&(week==='all'||String(s.week)===String(week))&&(!mock||s.mockNumber));},
 circuit(stations,count=20,seconds=90,random=Math.random){
  const pools=new Map();for(const s of stations){if(!pools.has(s.category))pools.set(s.category,[]);pools.get(s.category).push(s)}
  for(const rows of pools.values())for(let i=rows.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]]}
  const chosen=[],seen=new Set();while(chosen.length<Math.min(stations.length,Math.max(1,count-2))){let added=false;for(const rows of pools.values())if(rows.length&&chosen.length<count-2){let s;while(rows.length&&!s){const candidate=rows.pop();if(!seen.has(candidate.concept||candidate.id))s=candidate}if(s){seen.add(s.concept||s.id);chosen.push({station:s.id});added=true}}if(!added)break}
  if(chosen.length>=3){chosen.splice(Math.floor(chosen.length/3),0,{rest:true});chosen.splice(Math.floor(chosen.length*2/3)+1,0,{rest:true})}
  return {slots:chosen,seconds:Math.max(10,Math.min(600,Number(seconds)||90))};
 },
 position(run,now=Date.now()){const elapsed=Math.max(0,now-Date.parse(run.startedAt)),index=Math.floor(elapsed/(run.seconds*1000));return {index:Math.min(index,run.slots.length),remaining:Math.max(0,run.seconds-Math.floor(elapsed/1000)%run.seconds),finished:index>=run.slots.length};},
 score(run,stations){const byId=new Map(stations.map(s=>[s.id,s]));let total=0,earned=0,marked=0;for(const slot of run.slots){const s=byId.get(slot.station);if(!s)continue;s.parts.forEach((p,i)=>{total+=p.marks;const v=run.marks?.[s.id]?.[i];if(Number.isInteger(v)&&v>=0&&v<=p.marks){marked++;earned+=v}})}return {total,earned,marked,complete:marked===run.slots.filter(x=>x.station).reduce((n,x)=>n+(byId.get(x.station)?.parts.length||0),0),percent:total?earned/total*100:0};}
};
