import {env} from 'cloudflare:workers';
import {isOwner} from './academic-config.mjs';
/** Exact server-configured allowlist derived from the native Site owner's verified contact. */
export async function requestOwner(request:Request):Promise<boolean>{const id=request.headers.get('oai-authenticated-user-id');if(!id)return false;const cfg=env as typeof env & {REVIEW_STUDIO_OWNER_ACCOUNT_KEY?:string;REVIEW_STUDIO_OWNER_EMAIL?:string};if(await isOwner(id,cfg.REVIEW_STUDIO_OWNER_ACCOUNT_KEY))return true;const expected=cfg.REVIEW_STUDIO_OWNER_EMAIL?.trim().toLowerCase(),actual=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();return !!expected&&!!actual&&actual===expected}
