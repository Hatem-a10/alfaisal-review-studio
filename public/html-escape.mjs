// Escape untrusted values for HTML text and quoted attributes only. Do not use
// this helper for JS, CSS, URL protocol validation or unquoted attributes.
const entities=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'});
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>entities[c]);
