import {env} from 'cloudflare:workers';

export const accountHeader = 'X-Review-Account';

export async function reviewAccount(headers: Headers) {
 const id = headers.get('oai-authenticated-user-id');
 if (!id) return null;
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('review-studio-storage-v1:' + id));
 const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
 return {id, key, owner: id === env.REVIEW_OWNER_ID};
}

export async function requireAccountMatch(request: Request) {
 // The owner binding also acts as the deployment prerequisite for account-aware clients.
 if (!env.REVIEW_OWNER_ID) return null;
 const account = await reviewAccount(request.headers);
 if (account?.key === request.headers.get(accountHeader)) return null;
 return Response.json({error:'Your account changed. Reload Review Studio before continuing.'},
  {status:409,headers:{'Cache-Control':'no-store'}});
}
