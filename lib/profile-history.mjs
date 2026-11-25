export const validProfilePhoto=value=>typeof value==='string'&&value.length<=100000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);

const fields=['name','studentNumber','studentGroup','studentSection','labGroup','englishEnabled','englishFrequency','englishStartTime','profilePhoto','providerName','email'];

function profileFields(value){
 try{
  const row=JSON.parse(value);
  return Object.fromEntries(fields.filter(field=>Object.hasOwn(row,field)).filter(field=>field!=='profilePhoto'||row[field]===''||validProfilePhoto(row[field])).map(field=>[field,row[field]]));
 }catch{return {}}
}

export async function profileHistory(db,id){
 const {results=[]}=await db.prepare('SELECT changed_at,kind,before_json,after_json FROM review_profile_history WHERE account_id=? ORDER BY revision DESC LIMIT 30').bind(id).all();
 return results.flatMap(row=>{
  const before=profileFields(row.before_json),after=profileFields(row.after_json);
  const changes=fields.filter(field=>before[field]!==after[field]).map(field=>({field,previous:before[field]??null,current:after[field]??null}));
  return changes.length?[{at:row.changed_at,kind:row.kind,changes}]:[];
 });
}
