import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return new Response('Sign in required.',{status:401});
 const {id}=await params,figure=new URL(request.url).searchParams.get('figure');
 if(id!=='96bcf845-14d3-4695-b0ca-9d49f1ea693e'||!['8','23'].includes(figure||''))return new Response('Not found.',{status:404});
 if(!env.DB||!env.BUCKET)return new Response('Storage unavailable.',{status:503});
 const row=await env.DB.prepare('SELECT id FROM study_materials WHERE id = ? AND user_id = ?').bind(id,user).first();
 if(!row)return new Response('Not found.',{status:404});
 const item=await env.BUCKET.get('materials/'+user+'/'+id+'/original');if(!item)return new Response('Not found.',{status:404});
 try{const data=JSON.parse(await item.text()),encoded=data[figure!];if(typeof encoded!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(encoded))throw Error();const raw=atob(encoded.slice(encoded.indexOf(',')+1)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}})}catch{return new Response('Invalid figure.',{status:500})}
}
