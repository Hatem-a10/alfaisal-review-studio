// Client telemetry must never retain arbitrary exception text, stacks, URLs or account data.
const KINDS=new Set(['Error','TypeError','ReferenceError','SyntaxError','RangeError','URIError','EvalError','AbortError','QuotaExceededError','SecurityError','NetworkError','NotAllowedError','Unknown']);
export function safeClientError(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const kind=typeof value.kind==='string'&&KINDS.has(value.kind)?value.kind:'Unknown';
 const number=v=>Number.isSafeInteger(v)&&v>=0&&v<=10000000?v:0;
 const version=typeof value.version==='string'&&/^v[0-9]{1,4}\.[0-9]{2}$/.test(value.version)?value.version:'';
 return {kind,line:number(value.line),col:number(value.col),version};
}
export async function readClientError(request,maxBytes=4000){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))return null;
 if(!request.body)return null;
 const reader=request.body.getReader();let size=0;const chunks=[];
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();return null}chunks.push(value)}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}
  return safeClientError(JSON.parse(new TextDecoder().decode(data)));
 }catch{return null}finally{reader.releaseLock()}
}
