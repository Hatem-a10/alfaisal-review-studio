const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const id=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=180&&!/[\u0000-\u001f]/.test(v)?v.trim():'';
const clean=(v,max=1200)=>typeof v==='string'?v.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max):'';
const now=()=>new Date().toISOString();
const reportKinds=new Set(['incorrect-answer','incorrect-explanation','missing-source','ambiguous-wording','duplicate','broken-image','broken-link','other','technical']);
const reportStates=new Set(['open','investigating','resolved','rejected']);
const roles={reports:new Set(['owner','editor','moderator']),announcements:new Set(['owner','moderator'])};
const boundedInt=(value,min,max,fallback)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isSafeInteger(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;

async function readJson(request,limit=12000){
 const length=Number(request.headers.get('content-length')||0);if(length>limit)throw new Error('Request too large.');
 const reader=request.body?.getReader();if(!reader)return {};
 let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){reader.cancel().catch(()=>{});throw new Error('Request too large.');}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new Error('Invalid JSON.')}
}
const isSafeMutation=request=>request.headers.get('origin')===new URL(request.url).origin;
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
function fail(error){const message=String(error?.message||'');if(message==='Request too large.')return json({error:message},413);if(message==='Invalid JSON.')return json({error:message},400);return json({error:'The request could not be completed.'},400)}

export async function contentAdmin(ctx){
 const {request,env,user,role,section,action,data,mutate}=ctx;
 if(!['reports','announcements'].includes(section))return null;
 if(!user)return json({error:'Sign in required.'},401);
 if(!roles[section].has(role))return json({error:'You do not have permission for this action.'},403);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!isSafeMutation(request))return json({error:'Invalid origin.'},403);
 const db=env?.DB;if(!db)return json({error:'Content service unavailable.'},503);
 const params=new URL(request.url).searchParams;
 try{
  const value=data&&typeof data==='object'?data:request.method==='POST'?await readJson(request):{};
  if(!value||typeof value!=='object'||Array.isArray(value))return json({error:'Invalid request object.'},400);
  const page=boundedInt(value.page??params.get('page'),0,100000,0),limit=boundedInt(value.limit??params.get('limit'),1,100,30),offset=page*limit;
  if(section==='reports'){
   if(request.method==='GET'||action==='list'){
    const requestedStatus=value.status||params.get('status'),state=reportStates.has(requestedStatus)?requestedStatus:null;
    const fetchLimit=limit+1,identity=role==='owner'?'r.*,a.profile_json':'r.*',join=role==='owner'?' LEFT JOIN review_accounts a ON a.id=r.reporter_id':'',term=clean(params.get('q'),100).toLowerCase(),category=clean(params.get('category'),60).toLowerCase(),conditions=[],bindings=[];
    if(state){conditions.push('r.status=?');bindings.push(state)}
    if(category){conditions.push('lower(r.category)=?');bindings.push(category)}
    if(term){conditions.push('(instr(lower(r.question_id),?)>0 OR instr(lower(r.category),?)>0 OR instr(lower(r.details),?)>0)');bindings.push(term,term,term)}
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const count=await stmt(db,'SELECT count(*) AS total FROM review_question_reports r'+where,...bindings).first();
    const result=await stmt(db,`SELECT ${identity} FROM review_question_reports r${join}${where} ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?`,...bindings,fetchLimit,offset).all();
    const rows=result.results||[],hasMore=rows.length>limit;return json({reports:rows.slice(0,limit).map(r=>({id:r.id,questionId:r.question_id,category:r.category||r.kind,kind:r.kind,details:r.details,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,...(role==='owner'?{reporter:{name:parseName(r.profile_json),id:r.reporter_id}}:{}),reviewNote:r.review_note,revisionStatus:r.revision_status,revision:r.patch_json?{patch:parse(r.patch_json),source:r.source_reference}:null})),page,limit,total:count?.total||0,hasMore});
   }
   if(action==='update'){
    if(request.method!=='POST')return json({error:'POST required.'},405);
    const reportId=id(value.reportId),status=clean(value.status,30),note=clean(value.note,1200);
    if(!reportId||!reportStates.has(status))return json({error:'Choose a report and valid status.'},400);
    if(role==='editor'&&status!=='investigating')return json({error:'Editors may mark a report as investigating; moderators or the owner must resolve it.'},403);
    const exists=await stmt(db,'SELECT id FROM review_question_reports WHERE id=?',reportId).first();if(!exists)return json({error:'Report not found.'},404);
    await mutate([stmt(db,'UPDATE review_question_reports SET status=?,review_note=?,reviewed_by=?,updated_at=? WHERE id=?',status,note||null,user.id,now(),reportId)], 'question_report_'+status,reportId);
    return json({saved:true});
   }
   if(action==='propose'){
    if(request.method!=='POST')return json({error:'POST required.'},405);
    const reportId=id(value.reportId),source=clean(value.source,500),patch=value.patch;
    const allowed=new Set(['question','options','explanation','source','answer']);
    if(!reportId||!patch||typeof patch!=='object'||Array.isArray(patch)||!source)return json({error:'A report, proposed correction and source reference are required.'},400);
    const normalized={};for(const [key,v] of Object.entries(patch)){if(!allowed.has(key))return json({error:'Unsupported correction field.'},400);if(key==='answer'){if(!Number.isInteger(v)||v<0||v>4)return json({error:'Answer must be an option index from 0 to 4.'},400);normalized.answer=v}else if(key==='options'){if(!Array.isArray(v)||v.length<4||v.length>5||v.some(x=>typeof x!=='string'||!x.trim()))return json({error:'Options must contain four or five non-empty choices.'},400);normalized.options=v.map(x=>clean(x,500))}else{if(typeof v!=='string'||!v.trim())return json({error:'Correction fields must be non-empty text.'},400);normalized[key]=clean(v,key==='explanation'?3000:1200)}}
    if(!Object.keys(normalized).length)return json({error:'Add at least one proposed correction.'},400);
    if(Object.entries(normalized).some(([key,v])=>key!=='answer'&&(Array.isArray(v)?v.some(x=>!x):!v)))return json({error:'Correction text cannot be empty after normalization.'},400);
    if(normalized.options&&new Set(normalized.options.map(x=>x.toLowerCase())).size!==normalized.options.length)return json({error:'Options must be distinct.'},400);
    if(normalized.options&&Number.isInteger(normalized.answer)&&normalized.answer>=normalized.options.length)return json({error:'The selected answer does not exist in the proposed options.'},400);
    const existing=await stmt(db,'SELECT id,kind FROM review_question_reports WHERE id=?',reportId).first();if(!existing)return json({error:'Report not found.'},404);if(existing.kind==='technical')return json({error:'Technical reports do not accept question corrections.'},400);
    await mutate([stmt(db,"UPDATE review_question_reports SET patch_json=?,source_reference=?,revision_status='proposed',proposed_by=?,updated_at=? WHERE id=?",JSON.stringify(normalized),source,user.id,now(),reportId)], 'question_correction_proposed',reportId);
    return json({saved:true,revisionStatus:'proposed'});
   }
   if(action==='approve'||action==='reject'){
    if(role!=='owner')return json({error:'Only the verified owner may approve or reject a correction.'},403);
    if(request.method!=='POST')return json({error:'POST required.'},405);
    const reportId=id(value.reportId),source=clean(value.source,500);
    if(!reportId)return json({error:'Report ID is required.'},400);
    const existing=await stmt(db,'SELECT question_id,patch_json,source_reference,proposed_by,revision_status FROM review_question_reports WHERE id=?',reportId).first();if(!existing)return json({error:'Report not found.'},404);
    if(existing.revision_status!=='proposed')return json({error:'This correction is no longer awaiting review.'},409);
    if(action==='approve'&&(!existing.patch_json||!(source||existing.source_reference)))return json({error:'A proposed correction and source reference are required before approval.'},400);
    const status=action==='approve'?'approved':'rejected';
    const statements=[stmt(db,"UPDATE review_question_reports SET revision_status=?,source_reference=COALESCE(?,source_reference),reviewed_by=?,updated_at=? WHERE id=? AND revision_status='proposed' AND patch_json IS ? AND source_reference IS ? AND proposed_by IS ?",status,source||null,user.id,now(),reportId,existing.patch_json,existing.source_reference,existing.proposed_by),stmt(db,"INSERT INTO review_question_revisions (id,question_id,report_id,patch_json,source_reference,status,proposed_by,approved_by,created_at,updated_at) SELECT ?,question_id,id,patch_json,COALESCE(?,source_reference),?,?,?, ?,? FROM review_question_reports WHERE id=? AND revision_status=? AND changes()=1 AND patch_json IS NOT NULL AND NOT EXISTS (SELECT 1 FROM review_question_revisions WHERE report_id=? AND status='approved')",crypto.randomUUID(),source||null,status,existing.proposed_by||user.id,action==='approve'?user.id:null,now(),now(),reportId,status,reportId)];
    const outcome=await mutate(statements,'question_correction_'+status,reportId);if(outcome?.[0]?.meta?.changes===0)return json({error:'This correction has already been reviewed.'},409);
    return json({saved:true,revisionStatus:status,liveScoringChanged:false,releaseRequired:true});
   }
   return json({error:'Unknown reports action.'},400);
  }
  if(request.method==='GET'||action==='list'){
   const result=await stmt(db,'SELECT * FROM review_announcements ORDER BY updated_at DESC LIMIT ? OFFSET ?',limit+1,offset).all(),rows=result.results||[];
   return json({announcements:rows.slice(0,limit),page,limit,hasMore:rows.length>limit});
  }
  if(action==='save'||action==='publish'){
   if(request.method!=='POST')return json({error:'POST required.'},405);
   if(value.id&&!id(value.id))return json({error:'Announcement ID is invalid.'},400);
   const announcementId=id(value.id)||crypto.randomUUID(),title=clean(value.title,140),body=clean(value.body,3000);
   if(value.audience!==undefined&&!['global','class','group','lab'].includes(value.audience))return json({error:'Choose a valid announcement audience.'},400);
   if(typeof value.title!=='string'||value.title.trim().length>140||typeof value.body!=='string'||value.body.trim().length>3000)return json({error:'Title or announcement text is too long.'},400);
   const audience=value.audience||'global',targetClass=['M1','M2','F1','F2'].includes(value.targetClass)?value.targetClass:null,targetSection=['A','B'].includes(value.targetSection)?value.targetSection:null,targetLab=typeof value.targetLab==='string'&&value.targetLab.trim().length<=100?clean(value.targetLab,100)||null:null;
   if(value.targetLab&&targetLab===null)return json({error:'Lab group value is too long.'},400);
   const startsAt=value.startsAt?validDate(value.startsAt):now(),expiresAt=value.expiresAt?validDate(value.expiresAt):null;
   if(!title||!body)return json({error:'Title and announcement text are required.'},400);
   if(!startsAt||(value.expiresAt&&!expiresAt))return json({error:'Enter valid publication and expiration dates.'},400);
   if(audience==='class'&&!targetClass)return json({error:'Choose a class for a class announcement.'},400);
   if(audience==='group'&&(!targetClass||!targetSection))return json({error:'Choose a class and section for a group announcement.'},400);
   if(audience==='lab'&&!targetLab)return json({error:'Choose a lab group for a lab announcement.'},400);
   if(expiresAt&&expiresAt<=startsAt)return json({error:'Expiration must be after publication.'},400);
   const existing=value.id?await stmt(db,'SELECT status FROM review_announcements WHERE id=?',announcementId).first():null;
   if(action==='save'&&existing?.status==='published')return json({error:'This announcement is already published. Use Publish to replace it, or create a new draft.'},409);
   const status=action==='publish'?'published':'draft';
   const statement=stmt(db,`INSERT INTO review_announcements (id,title,body,audience,target_class,target_section,target_lab,priority,starts_at,expires_at,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,audience=excluded.audience,target_class=excluded.target_class,target_section=excluded.target_section,target_lab=excluded.target_lab,priority=excluded.priority,starts_at=excluded.starts_at,expires_at=excluded.expires_at,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at ${status==='draft'?"WHERE review_announcements.status<>'published'":''}`,announcementId,title,body,audience,targetClass,['group','lab'].includes(audience)?targetSection:null,audience==='lab'?targetLab:null,['normal','important','urgent'].includes(value.priority)?value.priority:'normal',startsAt,expiresAt,status,user.id,user.id,now(),now());
   const outcome=await mutate([statement],'announcement_'+status,announcementId);if(status==='draft'&&outcome?.[0]?.meta?.changes===0)return json({error:'Published announcements must be changed with Publish.'},409);
   return json({saved:true,id:announcementId,status});
  }
  if(action==='archive'){
   if(request.method!=='POST')return json({error:'POST required.'},405);
   const announcementId=id(value.id);if(!announcementId)return json({error:'Announcement ID is required.'},400);
   const exists=await stmt(db,'SELECT id FROM review_announcements WHERE id=?',announcementId).first();if(!exists)return json({error:'Announcement not found.'},404);
   await mutate([stmt(db,"UPDATE review_announcements SET status='archived',updated_by=?,updated_at=? WHERE id=?",user.id,now(),announcementId)],'announcement_archived',announcementId);return json({saved:true,status:'archived'});
  }
  return json({error:'Unknown announcements action.'},400);
 }catch(error){return fail(error)}
}

export async function contentStudent({request,env,user,row,path}){
 const pathname=path||new URL(request.url).pathname;
 if(!['/api/control-center/student/reports','/api/control-center/student/technical-report','/api/control-center/student/announcements','/api/control-center/student/errata'].includes(pathname))return null;
 if(!user)return json({error:'Sign in required.'},401);
 const db=env?.DB;if(!db)return json({error:'Content service unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!isSafeMutation(request))return json({error:'Invalid origin.'},403);
 try{
  if(pathname.endsWith('/reports')||pathname.endsWith('/technical-report')){
   const technical=pathname.endsWith('/technical-report');
   if(request.method==='GET'){
    if(technical)return json({error:'Method not allowed.'},405);
    const result=await stmt(db,'SELECT id,question_id,kind,details,status,created_at,updated_at FROM review_question_reports WHERE reporter_id=? ORDER BY created_at DESC LIMIT 100',user.id).all();return json({reports:result.results||[]});
   }
   const value=await readJson(request,5000);if(!value||typeof value!=='object'||Array.isArray(value))return json({error:'Invalid report object.'},400);const questionId=id(value.questionId),kind=clean(value.kind,40),details=clean(value.details,1000);
   if(typeof value.details==='string'&&value.details.trim().length>1000)return json({error:'Report details must be 1,000 characters or fewer.'},400);
   if(technical&&(questionId!=='site-technical'||kind!=='technical')||!technical&&(!questionId||questionId==='site-technical'||kind==='technical')||!reportKinds.has(kind)||!details)return json({error:technical?'A technical report must use the site-technical category.':'Question ID, report reason and details are required.'},400);
   const window=Math.floor(Date.now()/86400000),rate=await stmt(db,'INSERT INTO review_question_report_rate (reporter_id,window,count) VALUES (?,?,1) ON CONFLICT(reporter_id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window WHERE window!=excluded.window OR count<10 RETURNING count',user.id,window).first();
   if(!rate)return json({error:'Daily report limit reached. Please try again tomorrow.'},429);
    const context=technical?null:value.context;
    const course=clean(context?.course,24),paper=clean(context?.paper,160),page=Number.isSafeInteger(context?.page)&&context.page>0&&context.page<10000?context.page:null;
    const provenance=[course,paper,page?'Source page '+page:''].filter(Boolean).join(' · ');
    const reportId=crypto.randomUUID();await stmt(db,'INSERT INTO review_question_reports (id,reporter_id,question_id,kind,category,details,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',reportId,user.id,questionId,kind,kind,provenance?provenance+'\n\n'+details:details,'open',now(),now()).run();return json({saved:true,id:reportId},201);
  }
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  if(pathname.endsWith('/errata')){
   const result=await stmt(db,"SELECT question_id,patch_json,source_reference,updated_at FROM review_question_revisions WHERE status='approved' ORDER BY updated_at DESC LIMIT 500").all();
   const errata=(result.results||[]).map(r=>{const patch=parse(r.patch_json),safe={};for(const key of ['question','explanation','source'])if(typeof patch[key]==='string')safe[key]=patch[key];return {questionId:r.question_id,patch:safe,source:r.source_reference,updatedAt:r.updated_at}}).filter(r=>Object.keys(r.patch).length);
   return json({errata});
  }
  const profile=row?.effectiveProfile&&typeof row.effectiveProfile==='object'&&!Array.isArray(row.effectiveProfile)?row.effectiveProfile:parse(row?.profile_json),studentClass=profile.studentGroup||'',section=profile.studentSection||'',lab=profile.labGroup||'';
  // Apply account-held audience filters before LIMIT so unrelated groups cannot crowd out relevant messages.
  const instant=now(),result=await stmt(db,"SELECT id,title,body,priority,starts_at,expires_at FROM review_announcements WHERE status='published' AND starts_at<=? AND (expires_at IS NULL OR expires_at>?) AND (audience='global' OR (audience='class' AND target_class=?) OR (audience='group' AND target_class=? AND target_section=?) OR (audience='lab' AND target_lab=? AND (target_class IS NULL OR target_class='' OR target_class=?) AND (target_section IS NULL OR target_section='' OR target_section=?))) ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,starts_at DESC,id DESC LIMIT 100",instant,instant,studentClass,studentClass,section,lab,studentClass,section).all();
  return json({announcements:result.results||[]});
 }catch(error){return fail(error)}
}

function validDate(v){if(typeof v!=='string'||!v.trim())return null;const date=new Date(v);return Number.isFinite(date.getTime())?date.toISOString():null}
function parse(value){try{const parsed=JSON.parse(value||'{}');return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch{return {}}}
function parseName(value){const profile=parse(value);return clean(profile.name||'',100)||'Student'}
