const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function aggregateStudyCounts(value){
 const count=(n,max)=>Math.max(0,Math.min(max,Math.trunc(Number(n)||0)));
 return {completedReviews:count(value?.completedReviews,100000),answeredQuestions:count(value?.answeredQuestions,10000000)};
}
const text=v=>typeof v==='string'?v.trim().slice(0,100):'';
async function body(request){
 if(Number(request.headers.get('content-length'))>4096)throw Error('Request too large');
 const reader=request.body?.getReader();if(!reader)throw Error('Missing request');let n=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>4096){await reader.cancel();throw Error('Request too large')}parts.push(value)}
 const bytes=new Uint8Array(n);let at=0;for(const v of parts){bytes.set(v,at);at+=v.length}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function managedAccount(db,user){
 if(!db)throw Error('Account database unavailable');
 const now=new Date().toISOString();
 await db.prepare('INSERT INTO review_accounts (id,email,provider_name,created_at,last_seen_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,provider_name=excluded.provider_name,last_seen_at=excluded.last_seen_at').bind(user.id,user.email,text(user.name),now,now).run();
 return db.prepare('SELECT * FROM review_accounts WHERE id=?').bind(user.id).first();
}
export async function verifyPanelPassword(password,encoded){
 // This extra gate is owner-only; it never grants an account the owner role.
 if(typeof password!=='string'||password.length<1||password.length>256)return false;
 const match=/^pbkdf2-sha256\$100000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded||'');if(!match)return false;
 const bytes=s=>Uint8Array.from(s.match(/../g),c=>parseInt(c,16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(match[1]),iterations:100000},key,256)),expected=bytes(match[2]);let difference=0;
 for(let i=0;i<32;i++)difference|=actual[i]^expected[i];return difference===0;
}
export async function managedAccountRoute(request,env,user,row){
 const path=new URL(request.url).pathname,owner=request.headers.get('x-review-studio-owner')==='1',unlocked=owner&&row.admin_panel_unlocked===1;
 if(!['/auth/account','/auth/admin/accounts','/api/admin-auth'].includes(path))return null;
 if(!user)return response({error:'Sign in required.'},401);
 if(!['GET','POST'].includes(request.method))return response({error:'Method not allowed.'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Invalid origin.'},403);
 if(path==='/api/admin-auth'){
  if(!owner)return response({error:'This account is not the configured administrator.'},403);
  if(request.method==='GET')return response({admin:true,adminSettingsUnlocked:unlocked});
  if(!env.REVIEW_STUDIO_PANEL_PASSWORD_HASH)return response({error:'The administrator must configure the panel password.'},503);
  try{
   const value=await body(request),window=Math.floor(Date.now()/900000);
   const rate=await env.DB.prepare('INSERT INTO review_managed_admin_rate(account_id,window,attempts) VALUES(?,?,1) ON CONFLICT(account_id) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window WHERE window!=excluded.window OR attempts<5 RETURNING attempts').bind(user.id,window).first();
   if(!rate)return response({error:'Too many attempts. Try again later.'},429);
   if(!await verifyPanelPassword(value?.password,env.REVIEW_STUDIO_PANEL_PASSWORD_HASH))return response({error:'Invalid password.'},403);
   await env.DB.prepare('UPDATE review_accounts SET admin_panel_unlocked=1 WHERE id=?').bind(user.id).run();
   return response({admin:true,adminSettingsUnlocked:true});
  }catch{return response({error:'Admin verification unavailable.'},503)}
 }
 if(path==='/auth/account'){
  if(request.method==='GET')return response({owner,adminSettingsUnlocked:unlocked,analyticsOptIn:row.analytics_opt_in===1,profile:JSON.parse(row.profile_json||'{}')});
  try{
   const value=await body(request);if(!value||typeof value!=='object'||(value.analyticsOptIn!==undefined&&typeof value.analyticsOptIn!=='boolean')||(!value.profile&&typeof value.analyticsOptIn!=='boolean'))return response({error:'Invalid privacy preference.'},400);
   const profile=value.profile?{name:text(value.profile?.name),studentGroup:['M1','M2','F1','F2'].includes(value.profile?.studentGroup)?value.profile.studentGroup:'',studentSection:['A','B'].includes(value.profile?.studentSection)?value.profile.studentSection:'',labGroup:text(value.profile?.labGroup),englishFrequency:[2,3].includes(value.profile?.englishFrequency)?value.profile.englishFrequency:2}:JSON.parse(row.profile_json||'{}');
   if(value.analyticsOptIn===undefined){
    await env.DB.prepare('UPDATE review_accounts SET profile_json=? WHERE id=?').bind(JSON.stringify(profile),user.id).run();
    return response({saved:true});
   }
   const analytics=value.analyticsOptIn?(value.analytics?aggregateStudyCounts(value.analytics):JSON.parse(row.analytics_json||'{}')):{};
   await env.DB.prepare('UPDATE review_accounts SET analytics_opt_in=?,profile_json=?,analytics_json=? WHERE id=?').bind(value.analyticsOptIn?1:0,JSON.stringify(profile),JSON.stringify(analytics),user.id).run();return response({saved:true});
  }catch{return response({error:'Preferences could not be saved.'},400)}
 }
 if(!owner||!unlocked)return response({error:'Unlocked administrator access required.'},403);
 if(request.method==='GET'){
  const result=await env.DB.prepare('SELECT id,email,provider_name,created_at,last_seen_at,disabled,analytics_opt_in,profile_json,analytics_json FROM review_accounts ORDER BY created_at DESC LIMIT 200').all();
  return response({accounts:(result.results||[]).map(a=>({id:a.id,email:a.email,name:JSON.parse(a.profile_json||'{}').name||a.provider_name,createdAt:a.created_at,lastSeenAt:a.last_seen_at,disabled:a.disabled===1,profile:JSON.parse(a.profile_json||'{}'),analytics:a.analytics_opt_in===1?JSON.parse(a.analytics_json||'{}'):null})),limit:200});
 }
 try{const value=await body(request);if(typeof value?.id!=='string'||typeof value.disabled!=='boolean'||value.id===user.id)return response({error:'Choose another registered account.'},400);const target=await env.DB.prepare('SELECT id FROM review_accounts WHERE id=?').bind(value.id).first();if(!target)return response({error:'Account not found.'},404);await env.DB.prepare('UPDATE review_accounts SET disabled=? WHERE id=?').bind(value.disabled?1:0,value.id).run();return response({saved:true})}catch{return response({error:'Account could not be updated.'},400)}
}
