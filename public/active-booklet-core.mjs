export const activeBookletPaths=Object.freeze({
 MOL:'/api/site-assets/materials/mol114/interactive-booklet-v3-context.json',
 REN:'/api/site-assets/materials/ren123/interactive-booklet-v3-context.json',
});

// The private source packs are versioned. Do not infer missing keys or mutate source data.
export function validateActiveBooklet(pack,{version,pages,mcqs}){
 if(!pack||pack.version!==version||!Array.isArray(pack.questions)||!pack.questions.length)throw Error('Booklet question data is incomplete.');
 const ids=new Set(),aliases=new Set();
 const counts={mcq:0,saq:0,ospe:0};
 for(const q of pack.questions){
  if(!q||typeof q.id!=='string'||!q.id.trim()||ids.has(q.id))throw Error('Invalid or duplicate booklet question ID.');
  ids.add(q.id);
  if(!['mcq','saq','ospe'].includes(q.type)||typeof q.question!=='string'||!q.question.trim())throw Error('Invalid booklet question.');
  if(!Number.isSafeInteger(q.page)||q.page<1||q.page>pages)throw Error('Invalid booklet source page.');
  if(q.figures!==undefined&&(!Array.isArray(q.figures)||q.figures.some(f=>!f||typeof f.image!=='string'||!f.image)))throw Error('Invalid booklet figures.');
  counts[q.type]++;
  if(q.type==='mcq'){
   if(q.legacyChoices!==undefined&&(!q.legacyChoices||typeof q.legacyChoices!=='object'||Array.isArray(q.legacyChoices)))throw Error('Invalid booklet progress alias.');
   if(!Array.isArray(q.options)||q.options.length<2||q.options.some(o=>typeof o!=='string'||!o.trim()))throw Error('Invalid booklet answer choices.');
   for(const [id,order] of Object.entries(q.legacyChoices||{})){
    if(!id||aliases.has(id)||!Array.isArray(order)||order.length<2||order.some(i=>!Number.isInteger(i)||i< -1||i>=(q.previousOptions?.length??q.options.length)))throw Error('Invalid booklet progress alias.');
    aliases.add(id);
   }
   if(q.sourceLocations!==undefined&&(!Array.isArray(q.sourceLocations)||!q.sourceLocations.length||q.sourceLocations.some(loc=>!Number.isSafeInteger(loc?.page)||loc.page<1||loc.page>pages)))throw Error('Invalid repeated booklet location.');
   const keys=q.acceptedAnswers??(version>=3&&q.answer===null?[]:[q.answer]);
   if(!Array.isArray(keys)||(!keys.length&&q.answer!==null)||keys.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))throw Error('Invalid printed booklet answer key.');
   if(!(version>=3&&q.answer===null)&&(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length))throw Error('Invalid primary booklet answer key.');
  }
  if(q.contextQuestionIds!==undefined&&(!Array.isArray(q.contextQuestionIds)||q.contextQuestionIds.some(id=>typeof id!=='string')))throw Error('Invalid booklet context.');
 }
 if([...aliases].some(id=>ids.has(id)))throw Error('A booklet alias shadows an active question.');
 if(mcqs!==undefined&&counts.mcq!==mcqs)throw Error('Incorrect number of unique booklet MCQs.');
 if(version>=3&&Object.keys(counts).some(type=>(pack.counts?.[type]??0)!==counts[type]))throw Error('Booklet counts do not match the question data.');
 if(pack.chapters!==undefined&&(!Array.isArray(pack.chapters)||pack.chapters.some(c=>!c||!Number.isSafeInteger(c.page)||c.page<1||c.page>pages||typeof c.title!=='string')))throw Error('Invalid booklet chapter.');
 return pack;
}
export function bookletLoader(url,metadata,{fetcher=globalThis.fetch,timeout=30000}={}){
 let pending;
 return function load(){
  if(pending)return pending;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  pending=Promise.resolve().then(()=>fetcher(url,{credentials:'same-origin',signal:controller.signal})).then(response=>{
   if(!response.ok)throw Error('Could not load the booklet questions.');return response.json();
  }).then(pack=>validateActiveBooklet(pack,metadata)).catch(error=>{pending=null;throw error}).finally(()=>clearTimeout(timer));
  return pending;
 };
}
