import {servePack} from '../../../../lib/publisher-packs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const url=new URL(request.url),number=url.pathname.split('/').at(-1);if(!/^[1-5]$/.test(number||''))return new Response('Not found',{status:404});url.pathname='/tbl19/original-'+number+'.pdf';return servePack(new Request(url,request))}
