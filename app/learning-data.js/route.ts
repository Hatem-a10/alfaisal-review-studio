import {payload} from '../../lib/learning-payload';
export const dynamic='force-dynamic';
export async function GET(){const compressed=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));return new Response(compressed,{headers:{'Content-Type':'application/javascript; charset=utf-8','Content-Encoding':'gzip','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}})}
