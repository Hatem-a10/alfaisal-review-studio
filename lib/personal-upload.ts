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
