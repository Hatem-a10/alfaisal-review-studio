import {loadRenalBooklet} from './renal-booklet-data.mjs';

const source={
 id:'ren123-booklet-source',title:'REN 123 Past Paper Booklet',pages:294,
 url:'/api/site-assets/materials/ren123/past-paper-booklet.pdf',
};
const categories=[
 {id:'dry',title:'Anatomy',description:'Models and anatomical relationships'},
 {id:'histology',title:'Histology',description:'Tissues and microscopic landmarks'},
 {id:'radiology',title:'Radiology & sections',description:'Imaging and sectional anatomy'},
];
// Booklet IDs selected for usable figures and printed keys. Each item is one self-marked station.
const stationsByCategory={
 dry:['231-1','232-1','233-2','245-1','274-2','276-1'],
 histology:['250-2','251-2','254-3','255-2','256-1','257-2','258-1','259-1','260-2','261-1','265-1','271-2'],
 radiology:['280-1','284-1','290-2','291-1'],
};

export async function loadRenalOspe(){
 const {questions}=await loadRenalBooklet();
 const byId=new Map(questions.filter(q=>q.type==='ospe').map(q=>[q.id,q]));
 const stations=Object.entries(stationsByCategory).flatMap(([category, ids])=>ids.map(id=>{
  const question=byId.get('ren-booklet-ospe-p'+id);
  const figures=question?.figures;
  if(!question?.question||!question.sourceExplanation?.trim()||!figures?.length||
   !figures.every(f=>f.width>0&&f.height>0&&/^data:image\/(?:webp|png|jpeg);base64,/.test(f.image))){
   throw Error('A Renal OSPE station is incomplete. Please retry.');
  }
  return {id:question.id,category,title:'Booklet p'+id, source:source.id,page:question.page,
   figures,parts:[{prompt:question.question,answer:question.sourceExplanation,marks:1}]};
 }));
 return {version:1,categories,stations,sources:[source],corrections:[]};
}
