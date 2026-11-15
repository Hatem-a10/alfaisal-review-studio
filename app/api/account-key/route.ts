export const dynamic='force-dynamic';
/** Cheap identity probe: no profile, credentials or progress are returned or cached. */
export async function GET(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id)return Response.json({error:'Sign in required.'},{status:401,headers:{'Cache-Control':'no-store'}});const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id));return Response.json({accountKey:Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')},{headers:{'Cache-Control':'no-store'}})}
