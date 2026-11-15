import {TBL_ASSETS,ensureTblAsset} from '../../../lib/tbl19-import';
export const dynamic='force-dynamic';
// Fixed-content migration only; accepts no uploads, URLs or arbitrary keys.
export async function GET(){try{for(const asset of TBL_ASSETS)await ensureTblAsset(asset);return Response.json({verified:TBL_ASSETS},{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e instanceof Error?e.message:'Import failed'},{status:503})}}
