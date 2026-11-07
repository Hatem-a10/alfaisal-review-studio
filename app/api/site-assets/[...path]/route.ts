import {env} from 'cloudflare:workers';
import {serveAsset} from '../../../../lib/site-assets';
import {ownerId} from '../../../../lib/admin-auth';
import {studentGroupAccess} from '../../../../lib/student-lesson-access';

export const dynamic='force-dynamic';
type Params={params:Promise<{path:string[]}>};

async function read(request:Request,{params}:Params,headOnly=false) {
 if (!request.headers.get('oai-authenticated-user-id')) return new Response('Sign in required',{status:401});
 if (!env.BUCKET) return new Response('Storage unavailable',{status:503});
 const path=(await params).path.join('/');
 if (env.REVIEW_OWNER_ID && !ownerId(request.headers)) {
  const context=await studentGroupAccess(request);
  const approved=context?.group.lectures.some(lecture=>lecture.documents?.some(doc=>doc.path===path));
  if (!approved) return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 }
 const response=await serveAsset(request,env.BUCKET,path,headOnly);
 if (env.REVIEW_OWNER_ID) response.headers.set('Cache-Control','private, no-store');
 return response;
}

export function GET(request:Request,params:Params) {return read(request,params);}
export function HEAD(request:Request,params:Params) {return read(request,params,true);}
