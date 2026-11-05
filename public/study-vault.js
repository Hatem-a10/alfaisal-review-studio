/* Versioned companion stores shared by device saving, backup and private cloud sync. */
const StudyVault=(()=>{
 const prefix='alfaisal-review-studio-v1',metaKey=prefix+'-vault-meta-v1';
 const names={'wrong-bank-v1':'wrongBank','mock-history-v1':'history','mock-exam-v1':'mock','original-exam-runs-v1':'originals','lesson-drafts-v1':'drafts','study-resume-v1':'resume','study-practice-v1':'practice','upload-review-v1':'queue','visual-recall-v1':'visual','anki-progress-v1':'anki','study-options-v1':'options'};
 const byName=Object.fromEntries(Object.entries(names).map(([k,v])=>[v,prefix+'-'+k]));let muted=false,meta={};
 try{meta=JSON.parse(localStorage.getItem(metaKey)||'{}')}catch{}
 const rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;
 function changed(key){const suffix=key.startsWith(prefix+'-')?key.slice(prefix.length+1):'',name=names[suffix];if(muted||!name)return;meta[name]=new Date().toISOString();rawSet.call(localStorage,metaKey,JSON.stringify(meta));if(typeof scheduleSync==='function')scheduleSync()}
 Storage.prototype.setItem=function(k,v){const previous=this.getItem(k);rawSet.call(this,k,v);if(this===localStorage&&previous!==String(v))changed(String(k))};
 Storage.prototype.removeItem=function(k){const existed=this.getItem(k)!==null;rawRemove.call(this,k);if(this===localStorage&&existed)changed(String(k))};
 function read(name,fallback=null){try{return JSON.parse(localStorage.getItem(byName[name])||'null')??fallback}catch{return fallback}}
 function set(name,value){if(!byName[name])throw Error('Unknown study store');if(JSON.stringify(value)!==JSON.stringify(read(name)))localStorage.setItem(byName[name],JSON.stringify(value))}
 function shape(name,v){if(v===null)return true;const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x)),question=q=>obj(q)&&typeof q.id==='string'&&typeof q.question==='string'&&Array.isArray(q.lectureIds)&&q.lectureIds.every(id=>typeof id==='string')&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=8&&q.options.every(s=>typeof s==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length&&typeof q.explanation==='string'&&Array.isArray(q.reasons)&&q.reasons.length===q.options.length;
 const run=x=>obj(x)&&Array.isArray(x.questions)&&x.questions.length>0&&x.questions.length<=200&&x.questions.every(question)&&obj(x.answers);
 if(name==='history')return Array.isArray(v)&&v.length<=100&&v.every(x=>obj(x)&&typeof x.id==='string'&&Number.isFinite(x.correct)&&Number.isFinite(x.total));
 if(name==='wrongBank')return obj(v)&&Array.isArray(v.entries)&&v.entries.every(x=>obj(x)&&question(x.question)&&(x.choice===null||Number.isInteger(x.choice)))&&Array.isArray(v.exams)&&v.exams.every(x=>typeof x==='string');
 if(name==='mock')return run(v)&&Number.isFinite(v.deadline)&&obj(v.flags)&&typeof v.id==='string';
 if(name==='practice')return obj(v)&&(!v.set||run(v.set));
 if(name==='drafts')return obj(v)&&Object.values(v).every(x=>obj(x)&&Array.isArray(x.ids)&&Array.isArray(x.orders)&&obj(x.answers)&&obj(x.graded));
 if(name==='originals')return obj(v)&&Object.values(v).every(x=>obj(x)&&Array.isArray(x.ids)&&x.ids.length<=800&&x.ids.every(id=>typeof id==='string')&&obj(x.answers));
 if(name==='anki')return obj(v)&&obj(v.cards)&&Object.entries(v.cards).every(([k,x])=>/^[a-f0-9]{64}:\d+$/.test(k)&&obj(x)&&Number.isFinite(x.due)&&Number.isFinite(x.interval)&&Number.isFinite(x.reps)&&(!x.at||stamp(x.at)));
 if(name==='queue')return obj(v)&&obj(v.items)&&Object.values(v.items).every(x=>obj(x)&&typeof x.id==='string'&&Array.isArray(x.candidates)&&x.candidates.length<=500&&Array.isArray(x.scanned));
 if(name==='visual')return obj(v)&&obj(v.exercises)&&obj(v.results);
 return obj(v)}
 function valid(v){if(!v)return {version:1,stores:{}};if(v.version!==1||!v.stores||typeof v.stores!=='object'||Array.isArray(v.stores)||JSON.stringify(v).length>10000000)throw Error('Invalid extended backup');const stores={};for(const [k,e] of Object.entries(v.stores)){if(!byName[k]||!e||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))throw Error('Invalid saved study data');if(!shape(k,e.value??null))throw Error('Invalid '+k+' data in the backup');if(JSON.stringify(e.value??null).length>7000000)throw Error('Study data is too large');stores[k]={at:e.at,value:e.value??null}}return {version:1,stores}}
 function snapshot(){const stores={};for(const [name,key] of Object.entries(byName)){const value=read(name);if(value!==null||meta[name])stores[name]={at:meta[name]||'2000-01-01T00:00:00.000Z',value}}return {version:1,stores}}
 function merge(a,b){a=valid(a);b=valid(b);const stores={...a.stores};
 function byTime(x,y,f='at'){return (Date.parse(y?.[f])||0)>(Date.parse(x?.[f])||0)?y:x}
 function union(xs,ys,key,f){const m=new Map();for(const v of [...(xs||[]),...(ys||[])]){if(v&&v[key])m.set(v[key],m.has(v[key])?byTime(m.get(v[key]),v,f):v)}return [...m.values()]}
 for(const [k,v] of Object.entries(b.stores)){const old=stores[k];if(!old){stores[k]=v;continue}const recent=Date.parse(v.at)>Date.parse(old.at)?v:old,older=recent===v?old:v;let value=recent.value;if(old.value&&v.value){
 if(k==='options'){value={...older.value,...recent.value};if(old.value.anatomy||v.value.anatomy)value.anatomy={...older.value.anatomy,...recent.value.anatomy,attempts:union(old.value.anatomy?.attempts,v.value.anatomy?.attempts,'id','at').sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-500)};if(old.value.answerReceipts||v.value.answerReceipts){const receipts=union(old.value.answerReceipts,v.value.answerReceipts,'id','at').sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-30);while(receipts.length>1&&JSON.stringify(receipts).length>1800000)receipts.shift();value.answerReceipts=receipts}for(const field of ['grades','customCountdowns'])if(old.value[field]||v.value[field])value[field]=union(old.value[field],v.value[field],'id','updatedAt')}
 else if(k==='wrongBank'){const x=old.value,y=v.value,clearedAt=(Date.parse(y.clearedAt)||0)>(Date.parse(x.clearedAt)||0)?y.clearedAt:x.clearedAt;const all=new Map();for(const e of [...(x.entries||[]),...(y.entries||[])]){if(!e?.question?.id||Date.parse(e.missedAt)<=(Date.parse(clearedAt)||0))continue;const prev=all.get(e.question.id);all.set(e.question.id,prev?byTime(prev,e,'missedAt'):e)}value={entries:[...all.values()],exams:[...new Set([...(x.exams||[]),...(y.exams||[])])],...(clearedAt?{clearedAt}:{})}}
 else if(k==='history')value=union(old.value,v.value,'id','finishedAt').filter(e=>e.total>0&&e.correct*100>=e.total*15).sort((x,y)=>Date.parse(x.finishedAt)-Date.parse(y.finishedAt)).slice(-20);
 else if(k==='drafts'||k==='originals'){value={...older.value};for(const [id,item] of Object.entries(recent.value)){value[id]=value[id]?byTime(value[id],item,'updatedAt'):item}}
 else if(k==='anki'){const cards={...older.value.cards};for(const [id,c] of Object.entries(recent.value.cards||{}))cards[id]=cards[id]?byTime(cards[id],c):c;value={cards,session:recent.value.session}}
 else if(k==='queue'){const items={...older.value.items};for(const [id,item] of Object.entries(recent.value.items||{})){const prev=items[id];items[id]=prev?{...prev,...item,candidates:union(prev.candidates,item.candidates,'id','updatedAt')}:item}value={items}}
 else if(k==='visual'){value={exercises:{...older.value.exercises,...recent.value.exercises},results:{...older.value.results,...recent.value.results}}}
 else if(k==='mock'&&old.value.id===v.value.id&&!recent.value.finishedAt)value={...older.value,...recent.value,answers:{...older.value.answers,...recent.value.answers},flags:{...older.value.flags,...recent.value.flags}};
 }stores[k]={at:recent.at,value}}return {version:1,stores}}
 function apply(v,{mergeMissing=true}={}){v=valid(v);const next=mergeMissing?{version:1,stores:{...snapshot().stores,...v.stores}}:v;muted=true;try{for(const [k,e] of Object.entries(next.stores)){if(e.value===null)rawRemove.call(localStorage,byName[k]);else rawSet.call(localStorage,byName[k],JSON.stringify(e.value));meta[k]=e.at}rawSet.call(localStorage,metaKey,JSON.stringify(meta))}finally{muted=false}window.dispatchEvent(new CustomEvent('study-vault-restored'))}
 return {read,set,valid,snapshot,apply,merge};
})();
