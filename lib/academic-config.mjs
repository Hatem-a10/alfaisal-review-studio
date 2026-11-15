// Verified class/section lab lists extracted from the supplied official MOL schedules.
import {VERIFIED_GROUPS} from '../public/verified-groups.mjs';
export const VERIFIED_DEFAULT = VERIFIED_GROUPS;
const code = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9. -]{0,29}$/.test(value) && value === value.trim();

export function validateGroups(value) {
 if (!Array.isArray(value) || value.length < 1 || value.length > 100) return false;
 const pairs = new Set();
 for (const group of value) {
  if (!group || typeof group !== 'object' || Array.isArray(group) || Object.keys(group).sort().join(',') !== 'labGroups,studentGroup,studentSection' || !code(group.studentGroup) || !code(group.studentSection) || !Array.isArray(group.labGroups) || group.labGroups.length < 1 || group.labGroups.length > 100 || group.labGroups.some(v => !code(v)) || new Set(group.labGroups).size !== group.labGroups.length) return false;
  const key = JSON.stringify([group.studentGroup, group.studentSection]);
  if (pairs.has(key)) return false;
  pairs.add(key);
 }
 return true;
}

// Each row's configuration holds only the labs for that class/section pair.
export function groupsFromRows(rows) {
 if (!Array.isArray(rows)) throw new Error('Invalid academic configuration');
 if (!rows.length) return VERIFIED_DEFAULT.map(g => ({...g,labGroups:[...g.labGroups]}));
 const groups = rows.map(row => {
  let parsed;
  try { parsed = JSON.parse(row.configuration); } catch { throw new Error('Invalid academic configuration'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).join(',') !== 'labGroups') throw new Error('Invalid academic configuration');
  return {studentGroup:row.class_code,studentSection:row.group_code,labGroups:parsed.labGroups};
 });
 if (!validateGroups(groups)) throw new Error('Invalid academic configuration');
 return groups;
}

export async function isOwner(userId, ownerKey) {
 if (!userId || typeof ownerKey !== 'string' || !/^[a-f0-9]{64}$/.test(ownerKey)) return false;
 const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:' + userId)));
 const key = Array.from(bytes, v => v.toString(16).padStart(2,'0')).join('');
 return key === ownerKey;
}
export function sameOrigin(request) {
 const origin = request.headers.get('origin');
 return !!origin && origin === new URL(request.url).origin;
}
