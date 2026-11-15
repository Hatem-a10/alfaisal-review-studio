import {requestOwner} from './owner-access';
import {sameOrigin} from './academic-config.mjs';
/** Shared curriculum writes are owner-only. Personal materials keep their existing per-user routes. */
export async function sharedUploadAccess(request:Request):Promise<Response|null>{
 const id=request.headers.get('oai-authenticated-user-id');
 if(!id)return Response.json({error:'Sign in required.'},{status:401});
 if(!sameOrigin(request))return Response.json({error:'Invalid origin.'},{status:403});
 if(!await requestOwner(request))return Response.json({error:'Shared uploads require server owner authorization.'},{status:403});
 return null;
}
