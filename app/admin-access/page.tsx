import {headers} from 'next/headers';
import {ownerId, requireAdmin} from '../../lib/admin-auth';
import {AdminUnlock} from './unlock';
import {AdminManagement} from './management';

export const dynamic = 'force-dynamic';

export default async function AdminAccess() {
 const context = await headers();
 if (!ownerId(context))
  return <main><h1>Admin Settings</h1><p>Owner access required.</p><a href="/">Return to Review Studio</a></main>;
 const denied = await requireAdmin(new Request('https://review-studio.invalid/admin-access',{headers:context}));
 return denied ? <AdminUnlock /> : <AdminManagement />;
}
