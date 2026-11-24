const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const dateOf=value=>{
 if(typeof value!=='string'&&typeof value!=='number'||value===''||typeof value==='number'&&!Number.isFinite(value))return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return validDay(value)?value:null;
 try{const d=new Date(value);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):null}catch{return null}
};
const array=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const idOf=value=>typeof value==='string'&&value.length>0?value:null;
function attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}
// Unique recorded question identities per day; do not infer unsaved historical attempts.
export function questionHistory(records,practice={}){
 const days=new Map(),aliases=new Map(),attempts=attemptsOf(practice);
 function bucket(at){const day=dateOf(at);if(!day)return null;if(!days.has(day))days.set(day,{questions:new Set(),aggregates:new Map()});return days.get(day)}
 function put(at,id){if(idOf(id))bucket(at)?.questions.add(id)}
 for(const s of attempts)for(const q of array(s.questions)){
  const id=idOf(q?.id);if(!id)continue;
  const canonical=idOf(q.bookletCanonicalId)||idOf(q.canonicalId);
  if(canonical&&canonical!==id)aliases.set(id,canonical);
 }
 const canonical=id=>{if(!idOf(id))return null;const seen=new Map(),chain=[];let next=id;while(aliases.has(next)&&!seen.has(next)){seen.set(next,chain.length);chain.push(next);next=aliases.get(next)}return seen.has(next)?chain.slice(seen.get(next)).sort()[0]:next};
 for(const[id,r]of Object.entries(object(records))){
  for(const a of array(r?.learning?.attempts))if(a)put(a.at,canonical(a.q));
  for(const a of array(r?.mcqs)){
   if(!a||typeof a!=='object')continue;
   const qid=idOf(a.id)?.match(/^question:\d{4}-\d{2}-\d{2}:(.+)$/)?.[1],at=a.createdAt||a.date;
   if(qid){put(at,canonical(qid));continue}
   const n=a.total===undefined?1:a.total;
   if(!Number.isSafeInteger(n)||n<1||n>10000)continue;
   const group=bucket(at),key=JSON.stringify([id,idOf(a.id)||a.createdAt||a.date]);
   if(group)group.aggregates.set(key,Math.max(group.aggregates.get(key)||0,n));
  }
 }
 for(const[id,a]of Object.entries(object(practice?.booklet)))if(a&&(a.completed||typeof a.correct==='boolean'))put(a.at,canonical(id));
 for(const s of attempts)if(dateOf(s.finishedAt))for(const[i,q]of array(s.questions).entries()){
  const answer=s.answers?.[i];
  if(Number.isInteger(answer)&&answer>=0&&(!Array.isArray(q?.options)||answer<q.options.length))put(s.xp?.answeredAt?.[i]||s.finishedAt,canonical(q?.id));
 }
 return Object.fromEntries([...days].map(([d,v])=>[d,v.questions.size+[...v.aggregates.values()].reduce((a,b)=>a+b,0)]));
}
export function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];const candidates=[...Object.keys(days||{}),...Object.keys(baseline||{}),...Object.keys(questions||{})].filter(d=>valid(d)&&d<=end).sort(),last=Date.parse(end+'T12:00:00Z'),earliest=all&&candidates.length?Date.parse(candidates[0]+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}
