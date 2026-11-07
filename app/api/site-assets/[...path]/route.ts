import {env} from 'cloudflare:workers';
import {serveAsset} from '../../../../lib/site-assets';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{path:string[]}>}){if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});if(!env.BUCKET)return new Response('Storage unavailable',{status:503});return serveAsset(request,env.BUCKET,(await params).path.join('/'))}
export async function HEAD(request:Request,{params}:{params:Promise<{path:string[]}>}){if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});if(!env.BUCKET)return new Response('Storage unavailable',{status:503});return serveAsset(request,env.BUCKET,(await params).path.join('/'),true)}
