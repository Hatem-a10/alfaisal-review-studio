// Guided practicals reuse the source-reviewed teaching checks with independent lab IDs.
export function renalLabs(guides, questions) {
 const anatomy = {id:'ren-lab-wall-source',name:'posterior-wall-atf-lab.pdf',
  displayName:'Posterior abdominal wall practical · Dr. Atif',unit:'page'};
 const histology = {id:'ren-lab-kidney-source',name:'kidney-lab-1.pptx',
  displayName:'Kidney histology practical · Dr. Anikó',unit:'slide'};
 const sources=[anatomy,histology].map(source=>({...source,course:'REN',kind:'Lab handout',
  url:'/api/site-assets/materials/ren123/'+source.name,pages:[]}));
 const labs=[
  {id:'REN-LAB-posterior-wall',title:'Posterior abdominal wall',category:'dry',source:anatomy.id,
   summary:'Locate the posterior wall muscles, trace the main vessels and relate them to the lumbar plexus.',
   related:['REN-A1','REN-A2'],sectionIds:['REN-A1-muscles','REN-A1-aorta','REN-A1-ivc','REN-A2-landmarks']},
  {id:'REN-LAB-kidney-histology-1',title:'Kidney histology I',category:'histology',source:histology.id,
   summary:'Compare the cortical labyrinth, medullary rays and papilla, then identify the renal corpuscle, tubules and collecting ducts.',
   related:['REN-A5'],sectionIds:['REN-A5-map','REN-A5-corpuscle','REN-A5-tubules','REN-A5-ducts']},
 ];
 const modules=labs.map(({sectionIds,...lab})=>{
  const source=sources.find(s=>s.id===lab.source);
  const sections=lab.related.flatMap(id=>guides[id]?.sections||[]);
  const topics=sectionIds.map(id=>{
   const section=sections.find(s=>s.id===id);
   const suffix=id.replace(/^REN-[A-Z]\d+-/,'');
   return {...section,id:lab.id+':'+suffix,
    questions:questions.filter(q=>q.concept===id).map(q=>({...q,id:lab.id+':'+q.id})),
    activities:[],furtherReading:[
     {title:source.displayName,url:source.url},
     ...(lab.category==='histology'?[{title:'OlyVIA microscope slide links',url:'/api/site-assets/materials/ren123/olyvia-slides.docx'}]:[]),
    ]};
  });
  return {...lab,course:'REN',topics};
 });
 return {modules,sources};
}
