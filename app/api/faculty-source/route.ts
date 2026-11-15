import {servePack} from '../../../lib/publisher-packs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const url=new URL(request.url);url.pathname='/faculty/vlad-olena.pdf';return servePack(new Request(url,request))}
