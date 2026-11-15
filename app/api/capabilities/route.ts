import {env} from 'cloudflare:workers';
import {hasAdminRole} from '../../../lib/admin-auth-core.mjs';
import {requestOwner} from '../../../lib/owner-access';
export const dynamic='force-dynamic';
export async function GET(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id)return Response.json({admin:false},{headers:{'Cache-Control':'no-store'}});try{return Response.json({admin:await requestOwner(request)||await hasAdminRole(env.BUCKET,id)},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Authorization unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}}
