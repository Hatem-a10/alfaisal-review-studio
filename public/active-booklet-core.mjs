// The private source packs are versioned. Do not infer missing keys or mutate source data.
export function validateActiveBooklet(pack,{version,pages}){
 if(!pack||pack.version!==version||!Array.isArray(pack.questions)||!pack.questions.length)throw Error('Booklet question data is incomplete.');
 const ids=new Set();
 for(const q of pack.questions){
  if(!q||typeof q.id!=='string'||!q.id.trim()||ids.has(q.id))throw Error('Invalid or duplicate booklet question ID.');
  ids.add(q.id);
  if(!['mcq','saq','ospe'].includes(q.type)||typeof q.question!=='string'||!q.question.trim())throw Error('Invalid booklet question.');
  if(!Number.isSafeInteger(q.page)||q.page<1||q.page>pages)throw Error('Invalid booklet source page.');
  if(q.figures!==undefined&&(!Array.isArray(q.figures)||q.figures.some(f=>!f||typeof f.image!=='string'||!f.image)))throw Error('Invalid booklet figures.');
  if(q.type==='mcq'){
   if(!Array.isArray(q.options)||q.options.length<2||q.options.some(o=>typeof o!=='string'||!o.trim()))throw Error('Invalid booklet answer choices.');
   const keys=q.acceptedAnswers??[q.answer];
   if(!Array.isArray(keys)||!keys.length||keys.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))throw Error('Invalid printed booklet answer key.');
   if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error('Invalid primary booklet answer key.');
  }
  if(q.contextQuestionIds!==undefined&&(!Array.isArray(q.contextQuestionIds)||q.contextQuestionIds.some(id=>typeof id!=='string')))throw Error('Invalid booklet context.');
 }
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
