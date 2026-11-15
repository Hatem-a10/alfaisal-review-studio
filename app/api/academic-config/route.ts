import {requestOwner} from '../../../lib/owner-access';
import {env} from 'cloudflare:workers';
import {groupsFromRows, sameOrigin, validateGroups} from '../../../lib/academic-config.mjs';

export const dynamic = 'force-dynamic';
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
type AcademicGroup = {studentGroup:string; studentSection:string; labGroups:string[]};
type AcademicRow = {class_code:string; group_code:string; configuration:string};

export async function GET(request:Request) {
 if (!request.headers.get('oai-authenticated-user-id')) return json({error:'Sign in to view academic groups.'},401);
 if (!env.DB) return json({error:'Academic configuration is unavailable.'},503);
 try {
  const rows = await env.DB.prepare('SELECT class_code, group_code, configuration FROM review_academic_groups ORDER BY class_code, group_code').all<AcademicRow>();
  return json({groups:groupsFromRows(rows.results)});
 } catch { return json({error:'Academic configuration is unavailable.'},503); }
}

export async function PUT(request:Request) {
 const id = request.headers.get('oai-authenticated-user-id');
 if (!id) return json({error:'Sign in to update academic groups.'},401);
 if (!sameOrigin(request)) return json({error:'Invalid origin.'},403);
 if (!await requestOwner(request)) return json({error:'Owner authorization required.'},403);
 if (!env.DB) return json({error:'Academic configuration is unavailable.'},503);
 if (Number(request.headers.get('content-length')) > 100000) return json({error:'Configuration is too large.'},413);
 const raw = await request.text();
 if (raw.length > 100000) return json({error:'Configuration is too large.'},413);
 let body:unknown;
 try { body = JSON.parse(raw); } catch { return json({error:'Invalid JSON.'},400); }
 if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).join(',') !== 'groups' || !validateGroups((body as {groups:unknown}).groups)) return json({error:'Invalid academic configuration.'},400);
 const groups = (body as {groups:AcademicGroup[]}).groups;
 try {
  // D1 batch is atomic; no other table is changed.
  await env.DB.batch([
   env.DB.prepare('DELETE FROM review_academic_groups'),
   ...groups.map(group => env.DB!.prepare('INSERT INTO review_academic_groups (class_code, group_code, configuration) VALUES (?, ?, ?)').bind(group.studentGroup,group.studentSection,JSON.stringify({labGroups:group.labGroups})))
  ]);
  return json({groups});
 } catch { return json({error:'Academic configuration could not be saved.'},503); }
}
