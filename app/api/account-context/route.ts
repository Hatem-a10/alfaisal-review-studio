import {env} from 'cloudflare:workers';
import {reviewAccount} from '../../../lib/review-account';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
 const headers = {'Cache-Control':'no-store'};
 if (!env.REVIEW_OWNER_ID) return Response.json({error:'Account access is not configured.'},{status:503,headers});
 const account = await reviewAccount(request.headers);
 if (!account) return Response.json({signedIn:false},{headers});
 const {key, owner} = account;
 return Response.json({signedIn:true,key,owner,...(owner ? {profile:{name:'Hatem Alabrach',number:'#'}} : {})},{headers});
}
