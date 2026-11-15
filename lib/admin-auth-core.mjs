// Format: pbkdf2-sha256$<iterations>$<32 lowercase hex salt>$<64 lowercase hex digest>.
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), b => parseInt(b, 16));
export async function accountKey(user) {
 return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('review-studio-admin:' + user))));
}
export async function verifyAdminPassword(password, encoded) {
 if (typeof password !== 'string' || password.length < 1 || password.length > 256 || typeof encoded !== 'string') return false;
 const match = /^pbkdf2-sha256\$(\d{6,7})\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);
 if (!match) return false;
 const iterations = Number(match[1]);
 if (iterations < 310000 || iterations > 2000000) return false;
 const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
 const result = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:unhex(match[2]), iterations}, key, 256));
 const expected = unhex(match[3]);
 let difference = 0;
 for (let i = 0; i < expected.length; i++) difference |= result[i] ^ expected[i];
 return difference === 0;
}
export async function hasAdminRole(bucket, user) {
 if (!bucket || !user) return false;
 return !!(await bucket.head('admin-role/v1/' + await accountKey(user)));
}
