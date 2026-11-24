// Daily obligations are observed prospectively. Never reconstruct an old baseline from today's edited plan.
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const timestamp=v=>typeof v==='string'&&v.trim()!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||validDay(v))?Date.parse(v):NaN;
const localDate=at=>{try{const n=at instanceof Date?+at:timestamp(at);return Number.isFinite(n)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(n)):null}catch{return null}};
const array=v=>Array.isArray(v)?v:[];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const validId=v=>typeof v==='string'&&v.length>0&&!['__proto__','constructor','prototype'].includes(v);
function earliest(a,b){const x=timestamp(a),y=timestamp(b);return !Number.isFinite(x)?Number.isFinite(y)?b:null:!Number.isFinite(y)||x<=y?a:b}
function requiredTasks(rows){
 const map=new Map();
 for(const t of array(rows)){
  if(!validId(t?.id)||t.optional||t.required===false)continue;
  const old=map.get(t.id),task={id:t.id,title:typeof t.title==='string'&&t.title?t.title:t.id,lectureId:typeof t.lectureId==='string'?t.lectureId:null,pass:t.pass??null,completedAt:earliest(t.completedAt,null)};
  map.set(t.id,old?{...old,completedAt:earliest(old.completedAt,task.completedAt)}:task);
 }
 return [...map.values()];
}
export function completionBand(completed,total,known=true){
 if(!known||!Number.isSafeInteger(completed)||!Number.isSafeInteger(total)||completed<0||total<0)return {band:'unknown',percent:null};
 if(!total)return {band:'rest',percent:null};
 const percent=Math.max(0,Math.min(100,completed/total*100));
 return {band:percent===100?'green':percent>=80?'yellow-green':percent>=60?'yellow':percent>=40?'amber':percent>=20?'red-orange':'red',percent};
}
export function snapshotDay(date,required,previous,at=new Date().toISOString()){
 return {date,capturedAt:earliest(previous?.capturedAt,at),updatedAt:at,required:requiredTasks(required)};
}
function completedBy(at,date){const day=localDate(at);return !!day&&day<=date}
export function dayCompletion(date,baseline,activity){
 const unknown=()=>({date,...completionBand(0,0,false),required:null,completed:null,tasks:[],activity:activity||null});
 if(!validDay(date)||!baseline||!Array.isArray(baseline.required)||baseline.date!==undefined&&baseline.date!==date)return unknown();
 const tasks=requiredTasks(baseline.required),completed=tasks.filter(t=>completedBy(t.completedAt,date)).length;
 return {date,...completionBand(completed,tasks.length),required:tasks.length,completed,tasks,activity:activity||null};
}
function stamp(v){const n=timestamp(v);return Number.isFinite(n)?n:-Infinity}
export function mergeDaily(a={},b={},now=new Date()){
 const result={...object(a)},today=localDate(now);
 for(const[date,incoming]of Object.entries(object(b))){
  if(!validDay(date)||!incoming||!Array.isArray(incoming.required)||incoming.date!==undefined&&incoming.date!==date)continue;
  const old=result[date];
  if(!old||!Array.isArray(old.required)||old.date!==undefined&&old.date!==date){result[date]=incoming;continue}
  const historical=today&&date<today,latest=stamp(old.updatedAt)>=stamp(incoming.updatedAt)?old:incoming;
  if(!historical){result[date]=latest;continue}
  const observed=[old,incoming].filter(x=>completedBy(x.updatedAt,date)).sort((x,y)=>stamp(y.updatedAt)-stamp(x.updatedAt));
  const frozen=observed[0]||([old,incoming].filter(x=>Number.isFinite(timestamp(x.capturedAt))).sort((x,y)=>stamp(x.capturedAt)-stamp(y.capturedAt))[0]||old);
  const completions=new Map();
  for(const t of [...requiredTasks(old.required),...requiredTasks(incoming.required)])if(completedBy(t.completedAt,date))completions.set(t.id,earliest(completions.get(t.id),t.completedAt));
  result[date]={...frozen,required:requiredTasks(frozen.required).map(t=>({...t,completedAt:completions.get(t.id)||null}))};
 }
 return result;
}
