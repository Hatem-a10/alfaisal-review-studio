import {payload} from '../../../lib/learning-payload';
export const dynamic='force-dynamic';
let compressedBytes:Uint8Array<ArrayBuffer>|undefined;
function compressedPayload(){return compressedBytes??=Uint8Array.from(atob(payload),c=>c.charCodeAt(0))}
export async function GET(){const compressed=compressedPayload();return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}})}
