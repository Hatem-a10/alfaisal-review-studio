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
 dry:{
  '231-1':'Longitudinal kidney model',
  '232-1':'Posterior relations of the kidney',
  '233-2':'Order of structures at the renal hilum',
  '245-1':'Hepatorenal region on a sectional diagram',
  '274-2':'Posterior abdominal wall muscle',
  '276-1':'Pelvic vessels and vertebral level',
 },
 histology:{
  '250-2':'Regional landmarks of the renal cortex',
  '251-2':'Cortical tubules and reabsorption',
  '254-3':'Small tubular profiles',
  '255-2':'Renal tissue at low power',
  '256-1':'Glomerular vascular pole',
  '257-2':'Renal corpuscle and adjacent tubule',
  '258-1':'Renal zones on a whole section',
  '259-1':'Compare two convoluted tubules',
  '260-2':'Regional patterns in cortical histology',
  '261-1':'Renal corpuscle lining and space',
  '265-1':'Urinary bladder wall and distension',
  '271-2':'Urinary tract wall section',
 },
 radiology:{
  '280-1':'Kidney ultrasound landmarks',
  '284-1':'Ureteral junctions on contrast imaging',
  '290-2':'Axial upper abdominal section',
  '291-1':'Sagittal pelvic section',
 },
};

export async function loadRenalOspe(){
 const {questions}=await loadRenalBooklet();
 const byId=new Map(questions.filter(q=>q.type==='ospe').map(q=>[q.id,q]));
 const stations=Object.entries(stationsByCategory).flatMap(([category, stations])=>Object.entries(stations).map(([id,title])=>{
  const question=byId.get('ren-booklet-ospe-p'+id);
  const figures=question?.figures;
  if(!question?.question||!question.sourceExplanation?.trim()||!figures?.length||
   !figures.every(f=>f.width>0&&f.height>0&&/^data:image\/(?:webp|png|jpeg);base64,/.test(f.image))){
   throw Error('A Renal OSPE station is incomplete. Please retry.');
  }
  return {id:question.id,category,title, source:source.id,page:question.page,
   figures,parts:[{prompt:question.question,answer:question.sourceExplanation,marks:1}]};
 }));
 return {version:1,categories,stations,sources:[source],corrections:[]};
}
