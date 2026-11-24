// Audit 5: synthetic, local-only performance evidence. Never record user identifiers.
// Measurement capabilities A5-283, A5-284, A5-285 and reproducible data A5-289.
export function seededRandom(seed=1){
 if(!Number.isSafeInteger(seed)||seed<1||seed>0xffffffff)throw Error('Use a nonzero unsigned seed');
 let state=seed>>>0;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
}
export function syntheticAcademicFixture(seed=20261124,{accounts=24,materials=240,edits=250}={}){
 if(![accounts,materials,edits].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000)||accounts===0)throw Error('Unsafe fixture size');
 const random=seededRandom(seed),users=Array.from({length:accounts},(_,i)=>'synthetic-'+String(i).padStart(4,'0'));
 const records=Array.from({length:materials},(_,i)=>({
  id:'test-asset-'+String(i).padStart(5,'0'),
  user_id:users[Math.floor(random()*users.length)],
  lecture_id:i%7?'REN-P'+(1+i%20):'ANKI',
  bytes:1024+Math.floor(random()*16384),created_at:new Date(Date.UTC(2026,10,1+i%23)).toISOString()
 }));
 const changes=Array.from({length:edits},(_,i)=>({key:'mock-'+Math.floor(random()*1000),size:10+Math.floor(random()*1000)}));
 return {seed,users,records,changes};
}
export class IndexedDBWriteMeter {
 edits=0;transactions=0;writes=0;deletes=0;bytes=0;
 edit(count=1){this.edits+=count}
 transaction(){this.transactions++}
 put(value){this.writes++;this.bytes+=typeof value==='string'?Buffer.byteLength(value):value?.byteLength??0}
 remove(){this.deletes++}
 summary(){
  const operations=this.writes+this.deletes;
  return {edits:this.edits,transactions:this.transactions,writeOperations:operations,
   storedBytes:this.bytes,operationsPerEdit:this.edits?operations/this.edits:0,
   transactionsPerEdit:this.edits?this.transactions/this.edits:0};
 }
}
export class D1ReadMeter {
 calls=0;rowsRead=0;rowsWritten=0;rowsReturned=0;unknown=0;
 record(result){
  this.calls++;
  const meta=result?.meta;
  if(Number.isSafeInteger(meta?.rows_read)&&meta.rows_read>=0)this.rowsRead+=meta.rows_read;else this.unknown++;
  if(Number.isSafeInteger(meta?.rows_written)&&meta.rows_written>=0)this.rowsWritten+=meta.rows_written;
  this.rowsReturned+=Array.isArray(result?.results)?result.results.length:result?.results?1:0;
  return result;
 }
 summary(){return {calls:this.calls,rowsRead:this.rowsRead,rowsWritten:this.rowsWritten,rowsReturned:this.rowsReturned,unknownReads:this.unknown}}
}
export class R2TransferMeter {
 requests=0;bytes=0;byClass=new Map();
 // Attach to a synthetic R2 stream or one that has already passed normal authorization.
 record(resourceClass,byteCount){
  if(!['pdf','image','metadata','other'].includes(resourceClass)||!Number.isSafeInteger(byteCount)||byteCount<0)throw Error('Invalid transfer metric');
  this.requests++;this.bytes+=byteCount;
  const row=this.byClass.get(resourceClass)||{requests:0,bytes:0};row.requests++;row.bytes+=byteCount;this.byClass.set(resourceClass,row);
 }
 summary(){return {requests:this.requests,bytes:this.bytes,byClass:Object.fromEntries(this.byClass)}}
}
