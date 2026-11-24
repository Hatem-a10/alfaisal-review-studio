// Personal originals and Anki packages share one logical quota. D1's single conditional INSERT
// checks the limit atomically with metadata creation; concurrent uploads cannot exceed it.
export const PERSONAL_UPLOAD_LIMIT=500_000_000;
export type PersonalUpload={id:string;user:string;name:string;lectureId:string;mime:string;bytes:number;pageCount:number;createdAt:string};
export async function reservePersonalUpload(db:D1Database,row:PersonalUpload,limit=PERSONAL_UPLOAD_LIMIT){
 const result=await db.prepare(`INSERT INTO study_materials (id,user_id,name,lecture_id,mime,bytes,page_count,created_at)
 SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM study_materials WHERE user_id=?)<=?
 ON CONFLICT(id) DO NOTHING`).bind(row.id,row.user,row.name,row.lectureId,row.mime,row.bytes,row.pageCount,row.createdAt,row.user,limit-row.bytes).run();
 return Number(result.meta.changes)>0;
}
export async function withinPersonalQuota(db:D1Database,user:string,bytes:number,limit=PERSONAL_UPLOAD_LIMIT){
 const row=await db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes FROM study_materials WHERE user_id=?').bind(user).first<{bytes:number}>();
 return Number(row?.bytes||0)+bytes<=limit;
}
export async function fileDigest(file:File){
 // Workers expose a streaming digest, avoiding a second 50 MB allocation. Local tests use Web Crypto.
 const DigestStream=(crypto as Crypto & {DigestStream?:new(algorithm:string)=>WritableStream<Uint8Array> & {digest:Promise<ArrayBuffer>}}).DigestStream;
 let digest:ArrayBuffer;
 if(DigestStream){const stream=new DigestStream('SHA-256');await file.stream().pipeTo(stream);digest=await stream.digest}
 else digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function hasZipHeader(file:File){
 const bytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
 return bytes.length===4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
}
export async function hasPdfHeader(file:File){
 const bytes=new Uint8Array(await file.slice(0,1024).arrayBuffer());
 return new TextDecoder().decode(bytes).includes('%PDF-');
}

// Structural ZIP validation, not a claim that a compressed database has valid card rows.
// Central directory is bounded, then the recognized collection's local header is checked.
export async function hasAnkiCollection(file:File):Promise<boolean>{
 if(file.size<22||file.size>50000000)return false;
 const tailStart=Math.max(0,file.size-65557),tail=new Uint8Array(await file.slice(tailStart).arrayBuffer()),v=new DataView(tail.buffer);
 let e=-1;for(let i=tail.length-22;i>=0;i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===tail.length){e=i;break}
 if(e<0||v.getUint16(e+4,true)!==0||v.getUint16(e+6,true)!==0)return false;
 const count=v.getUint16(e+10,true),size=v.getUint32(e+12,true),start=v.getUint32(e+16,true);
 if(!count||count>30000||v.getUint16(e+8,true)!==count||size>16000000||start+size!==tailStart+e)return false;
 const dir=new Uint8Array(await file.slice(start,start+size).arrayBuffer()),d=new DataView(dir.buffer),decoder=new TextDecoder();
 const names=new Set<string>();let pos=0,expanded=0,collection:{name:string;offset:number;bytes:number}|null=null;
 for(let i=0;i<count;i++){
  if(pos+46>dir.length||d.getUint32(pos,true)!==0x02014b50)return false;
  const flags=d.getUint16(pos+8,true),method=d.getUint16(pos+10,true),compressed=d.getUint32(pos+20,true),raw=d.getUint32(pos+24,true),nameLen=d.getUint16(pos+28,true),extra=d.getUint16(pos+30,true),comment=d.getUint16(pos+32,true),offset=d.getUint32(pos+42,true),end=pos+46+nameLen+extra+comment;
  if(end>dir.length||!nameLen||flags&1||![0,8].includes(method)||offset+30+compressed>start||d.getUint16(pos+34,true)!==0)return false;
  expanded+=raw;if(expanded>250000000)return false;
  const name=decoder.decode(dir.subarray(pos+46,pos+46+nameLen));if(names.has(name))return false;names.add(name);
  if(['collection.anki2','collection.anki21','collection.anki21b'].includes(name)&&compressed>0&&raw>0)collection={name,offset,bytes:compressed};
  pos=end;
 }
 if(pos!==dir.length||!collection)return false;
 const header=new Uint8Array(await file.slice(collection.offset,collection.offset+30).arrayBuffer());if(header.length!==30)return false;
 const h=new DataView(header.buffer),length=h.getUint16(26,true),extra=h.getUint16(28,true);
 if(h.getUint32(0,true)!==0x04034b50||collection.offset+30+length+extra+collection.bytes>start)return false;
 return decoder.decode(await file.slice(collection.offset+30,collection.offset+30+length).arrayBuffer())===collection.name;
}
