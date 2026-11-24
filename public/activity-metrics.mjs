const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
let riyadhFormatter;
const dateOf=value=>{
 if(typeof value!=='string'&&typeof value!=='number'||value===''||typeof value==='number'&&!Number.isFinite(value))return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return validDay(value)?value:null;
 try{const d=new Date(value);return Number.isFinite(+d)?(riyadhFormatter??=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'})).format(d):null}catch{return null}
};
const array=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const idOf=value=>typeof value==='string'&&value.length>0?value:null;
function attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}
// Unique recorded question identities per day; do not infer unsaved historical attempts.
export function questionHistory(records,practice={}){
 const days=new Map(),aliases=new Map(),attempts=attemptsOf(practice),dateKeys=new Map();
 // Keep normalization local to this calculation and cap retained distinct timestamps.
 function dayOf(at){if(dateKeys.has(at))return dateKeys.get(at);const day=dateOf(at);if(day&&dateKeys.size<512)dateKeys.set(at,day);return day}
 function bucket(at){const day=dayOf(at);if(!day)return null;if(!days.has(day))days.set(day,{questions:new Set(),aggregates:new Map()});return days.get(day)}
 function put(at,id){if(idOf(id))bucket(at)?.questions.add(id)}
 for(const s of attempts)for(const q of array(s.questions)){
  const id=idOf(q?.id);if(!id)continue;
  const canonical=idOf(q.bookletCanonicalId)||idOf(q.canonicalId);
  if(canonical&&canonical!==id)aliases.set(id,canonical);
 }
 const resolved=new Map();
 const canonical=id=>{if(!idOf(id))return null;if(!aliases.has(id))return id;if(resolved.has(id))return resolved.get(id);const seen=new Map(),chain=[];let next=id;while(aliases.has(next)&&!seen.has(next)&&!resolved.has(next)){seen.set(next,chain.length);chain.push(next);next=aliases.get(next)}let result;if(resolved.has(next))result=resolved.get(next);else if(seen.has(next)){result=next;for(let i=seen.get(next);i<chain.length;i++)if(chain[i]<result)result=chain[i]}else result=next;for(const key of chain)resolved.set(key,result);return result};
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
 for(const s of attempts)if(dayOf(s.finishedAt))for(const[i,q]of array(s.questions).entries()){
  const answer=s.answers?.[i];
  if(Number.isInteger(answer)&&answer>=0&&(!Array.isArray(q?.options)||answer<q.options.length))put(s.xp?.answeredAt?.[i]||s.finishedAt,canonical(q?.id));
 }
 const history={};
 for(const [day,group] of days){let total=0;for(const count of group.aggregates.values())total+=count;history[day]=group.questions.size+total}
 return history;
}
export function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];let first=null;if(all)for(const source of [days,baseline,questions])for(const d of Object.keys(source||{}))if(d<=end&&(first===null||d<first)&&valid(d))first=d;const last=Date.parse(end+'T12:00:00Z'),earliest=first!==null?Date.parse(first+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}
