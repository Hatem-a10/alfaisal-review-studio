import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return Response.json({error:'Sign in required.'},{status:401});
 const {id}=await params;if(!/^[\w-]{1,80}$/.test(id))return Response.json({error:'Invalid document.'},{status:400});
 if(!env.DB||!env.BUCKET)return Response.json({error:'Storage unavailable.'},{status:503});
 const row=await env.DB.prepare('SELECT id, name, mime FROM study_materials WHERE id = ? AND user_id = ?').bind(id,user).first<{id:string;name:string;mime:string}>();if(!row)return Response.json({error:'Not found.'},{status:404});
 const text=new URL(request.url).searchParams.get('format')==='text',obj=await env.BUCKET.get('materials/'+user+'/'+id+(text?'/text':'/original'));if(!obj)return Response.json({error:'Not found.'},{status:404});
 return new Response(obj.body,{headers:{'Content-Type':text?'application/json':row.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(!text?{'Content-Disposition':(row.mime==='application/pdf'?'inline':'attachment')+'; filename*=UTF-8\'\''+encodeURIComponent(row.name)}:{})}})
}
