// Called only with the sanitized, authenticated request produced by the Worker.
export const OFFLINE_ACCOUNT_HEADER='X-Review-Cache-Account';
export const privateOfflinePath=path=>/^\/api\/(study-assets|site-assets|private-media|mock-figure)\//.test(path);
export async function stampOfflineAccount(response,request){
 if(request.method!=='GET'||!response.ok||!privateOfflinePath(new URL(request.url).pathname))return response;
 const id=request.headers.get('oai-authenticated-user-id');
 if(!id)return response;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id));
 const account=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const headers=new Headers(response.headers);headers.set(OFFLINE_ACCOUNT_HEADER,account);headers.set('Cache-Control','private, no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
