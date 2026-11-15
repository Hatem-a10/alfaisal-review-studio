import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required.',{status:401});
 const {id}=await params;if(!/^[a-f0-9]{64}$/.test(id))return new Response('Not found.',{status:404});
 if(!env.BUCKET)return new Response('Shared decks unavailable.',{status:503});
 try{const obj=await env.BUCKET.get('shared-anki/v1/'+id);if(!obj)return new Response('Not found.',{status:404});return new Response(obj.body,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}catch{return new Response('Shared decks unavailable.',{status:503})}
}
