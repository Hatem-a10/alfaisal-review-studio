import {lockAdmin, ownerId, unlockAdmin} from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
 return Response.json({owner: Boolean(ownerId(request.headers))}, {headers:{'Cache-Control':'no-store'}});
}

export const POST = unlockAdmin;
export const DELETE = lockAdmin;
