const subjectPattern = /^user_[A-Za-z0-9]{1,120}$/;
const verifierPattern = /^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/;

export function productionPolicy(env) {
 if (env.REVIEW_STUDIO_DEPLOYMENT !== 'production' ||
     env.REVIEW_STUDIO_OWNER_REAUTH !== '1' ||
     !subjectPattern.test(env.REVIEW_STUDIO_CLERK_OWNER_SUB || '') ||
     !verifierPattern.test(env.REVIEW_STUDIO_PANEL_PASSWORD_HASH || '')) return null;
 if (env.REVIEW_STUDIO_ACCESS === 'open') return {restricted:false, reviewers:new Set()};
 if (env.REVIEW_STUDIO_ACCESS !== 'restricted') return null;
 const raw=env.REVIEW_STUDIO_REVIEWER_SUBS || '[]';
 if (typeof raw!=='string' || raw.length>5000) return null;
 try {
  const subjects=JSON.parse(raw);
  if (!Array.isArray(subjects) || subjects.length>25 || subjects.some(id=>typeof id!=='string'||!subjectPattern.test(id))) return null;
  return {restricted:true,reviewers:new Set([env.REVIEW_STUDIO_CLERK_OWNER_SUB,...subjects])};
 } catch {return null;}
}

export function mayUseProduction(policy, user) {
 if (!policy || !user) return false;
 if (!policy.restricted) return true;
 return policy.reviewers.has(user.subject);
}

export async function isProductionDatabase(db) {
 if (!db) return false;
 try {
  const marker=await db.prepare("SELECT environment FROM review_release_environment WHERE id=1").first();
  return marker?.environment==='production';
 } catch {return false;}
}

// Bound expensive writes in production without restricting reads, exports, or recovery.
export async function allowProductionWrite(db, actor, path, method, now=Date.now()) {
 const upload=method==='POST'&&['api/materials','api/decks'].includes(path);
 const sync=['PUT','PATCH'].includes(method)&&path==='api/progress';
 const telemetry=method==='POST'&&path==='api/client-error';
 if(!upload&&!sync&&!telemetry)return true;
 const bucket=upload?'production-personal-upload':telemetry?'production-client-error':'production-progress-write';
 const window=Math.floor(now/(upload?86400000:3600000));
 const limit=upload?20:telemetry?30:600;
 const row=await db.prepare(`INSERT INTO control_rate(actor,bucket,window,attempts) VALUES (?,?,?,1)
  ON CONFLICT(actor,bucket) DO UPDATE SET window=excluded.window,
  attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END
  WHERE window<>excluded.window OR attempts<? RETURNING attempts`).bind(actor,bucket,window,limit).first();
 return !!row;
}
