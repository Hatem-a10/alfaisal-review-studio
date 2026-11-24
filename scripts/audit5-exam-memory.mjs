// Audit 5 A5-287 — stage-sampled heap high-water mark for synthetic exam review.
// Measurements are diagnostic, never used for scoring, storage or student telemetry.
export function createReviewMemorySampler({memory=()=>process.memoryUsage(),clock=()=>performance.now()}={}){
 const samples=[];const started=clock();
 return {
  checkpoint(stage){
   if(typeof stage!=='string'||!/^[-a-z0-9]{1,42}$/.test(stage))throw Error('Use a non-identifying stage label');
   const m=memory();if(!Number.isFinite(m?.heapUsed)||m.heapUsed<0)throw Error('Invalid heap sample');
   const row={stage,elapsedMs:Math.max(0,clock()-started),heapUsed:m.heapUsed,external:Number.isFinite(m.external)?m.external:0,heapTotal:Number.isFinite(m.heapTotal)?m.heapTotal:0};
   samples.push(row);return row;
  },
  summary(){
   if(!samples.length)return {samples:[],maxSampledHeapUsed:0,maxSampledExternal:0};
   return {samples:samples.map(x=>({...x})),maxSampledHeapUsed:Math.max(...samples.map(s=>s.heapUsed)),
     maxSampledExternal:Math.max(...samples.map(s=>s.external)),
     // The maximum of discrete samples is a lower bound on true peak, not continuous profiling.
     kind:'discrete-stage-sampled-lower-bound'};
  }
 };
}
export function syntheticReviewBank(size=640){
 if(!Number.isSafeInteger(size)||size<1||size>5000)throw Error('Unsafe synthetic exam fixture size');
 return Array.from({length:size},(_,i)=>({
  id:'synthetic-q-'+i,canonicalId:'synthetic-q-'+i,lectureIds:['REN-P'+(i%20+1)],
  kind:'Lecture synthetic',question:'Synthetic renal pathway number '+i+' with deterministic salt '+((i*7919)%10007)+'?',
  options:['First unique mechanism '+i,'Second mechanism '+i,'Third mechanism '+i,'Fourth mechanism '+i],
  answer:i%4,explanation:'Explanation fixture '+i,reasons:['R1','R2','R3','R4'],
  concept:'synthetic '+(i%8)
 }));
}
