// Audit 5: locally reproduced performance diagnostics, no identifiers or telemetry.
// A5-286: synthetic course-pack JavaScript compilation time.
// A5-288: separate cold/warm startup timing with independent labeled samples.
// A5-293: eligible service-worker cache hit ratio grouped by resource class.
export function quantiles(samples){
 if(!Array.isArray(samples)||!samples.length||samples.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid performance samples');
 const ordered=[...samples].sort((a,b)=>a-b),at=p=>ordered[Math.max(0,Math.ceil(p*ordered.length)-1)];
 return {n:ordered.length,p50:at(.5),p95:at(.95),min:ordered[0],max:ordered.at(-1)};
}
export function measureOperation(operation,{runs=7,clock=()=>performance.now()}={}){
 if(typeof operation!=='function'||!Number.isSafeInteger(runs)||runs<1||runs>10000)throw Error('Invalid benchmark');
 const durations=[];
 for(let i=0;i<runs;i++){const start=clock();operation();durations.push(Math.max(0,clock()-start))}
 return quantiles(durations);
}
export function startupPhases(entries,{mode='warm'}={}){
 if(mode!=='cold'&&mode!=='warm')throw Error('Invalid startup mode');
 const mark=name=>{const rows=entries.filter(e=>e.name===name&&Number.isFinite(e.startTime));return rows.at(-1)?.startTime};
 const started=mark('studio-bootstrap-start'),account=mark('studio-account-verified'),device=mark('studio-device-hydrated'),scripts=mark('studio-scripts-loaded');
 if([started,account,device,scripts].some(t=>t===undefined))return null;
 if(!(started<=account&&account<=device&&device<=scripts))return null;
 return {mode,accountMs:account-started,hydrationMs:device-account,scriptsMs:scripts-device,totalMs:scripts-started};
}
export function summarizeStartupModes(samples){
 const cold=samples.filter(s=>s?.mode==='cold'),warm=samples.filter(s=>s?.mode==='warm');
 const summary=rows=>rows.length?{total:quantiles(rows.map(x=>x.totalMs)),account:quantiles(rows.map(x=>x.accountMs)),hydration:quantiles(rows.map(x=>x.hydrationMs)),scripts:quantiles(rows.map(x=>x.scriptsMs))}:null;
 return {cold:summary(cold),warm:summary(warm)};
}
export class CacheHitMeter {
 #data=new Map();
 record(kind,hit){
  if(!['core','navigation','private'].includes(kind)||typeof hit!=='boolean')throw Error('Only eligible cache lookups may be measured');
  const row=this.#data.get(kind)||{hits:0,misses:0};
  if(hit)row.hits++;else row.misses++;
  this.#data.set(kind,row);
 }
 summary(){
  return Object.fromEntries([...this.#data].map(([kind,{hits,misses}])=>[kind,{hits,misses,requests:hits+misses,hitRatio:hits/(hits+misses)}]));
 }
}
