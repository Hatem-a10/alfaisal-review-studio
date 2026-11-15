import {env} from 'cloudflare:workers';
import {requestOwner} from '../../../lib/owner-access';
import {hasAdminRole} from '../../../lib/admin-auth-core.mjs';
import log from '../../../lib/lecture-changelog-runtime.json';
export const dynamic='force-dynamic';
export async function GET(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id)return Response.json({error:'Sign in required.'},{status:401,headers:{'Cache-Control':'no-store'}});if(!await requestOwner(request)&&!await hasAdminRole(env.BUCKET,id))return Response.json({error:'Admin authorization required.'},{status:403,headers:{'Cache-Control':'no-store'}});return Response.json(log,{headers:{'Cache-Control':'no-store'}})}
