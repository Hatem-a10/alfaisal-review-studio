/** Bounded request decoding: count actual bytes, regardless of Content-Length. */
export class RequestTooLarge extends Error {}
export async function readBounded(request:Pick<Request,'headers'|'body'>,limit:number):Promise<Uint8Array<ArrayBuffer>>{
 const declared=request.headers.get('content-length');
 if(declared!==null&&Number(declared)>limit)throw new RequestTooLarge('Request is too large.');
 const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
 if(reader)try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){reader.cancel().catch(()=>{});throw new RequestTooLarge('Request is too large.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes;
}
export async function boundedForm(request:Request,limit:number):Promise<FormData>{
 const bytes=await readBounded(request,limit);
 return new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}
