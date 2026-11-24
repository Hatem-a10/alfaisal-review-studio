import {anatomyChecks} from './renal-anatomy-checks.mjs';
import {renalPhysiology} from './renal-physiology.mjs';
import {courses} from './course-registry.mjs';

// Authored study aids. Page and slide numbers refer to the private REN 123 source decks.
const renalAnatomy = [
 {code:'A1',title:'Posterior abdominal wall I',source:'posterior-wall-1',file:'posterior-wall-1.pdf',unit:'page',group:'Anatomy',
  overview:'Build a map of the posterior wall from the muscles to the aorta and IVC. Use that map to work out what a lesion can compress and where blood returns.',
  objectives:['Describe the muscles and fasciae of the posterior abdominal wall.','Trace the abdominal aorta and distinguish its branch groups.','Localize a typical abdominal aortic aneurysm.','Trace the inferior vena cava and its asymmetric tributaries.'],
  topics:[
   {key:'muscles',title:'Posterior wall muscles and fascia',pages:[4,5,6,7],
    body:['The quadratus lumborum spans the iliac crest and the 12th rib. It laterally flexes the trunk and stabilizes the 12th rib. Psoas major lies more medially, alongside the lumbar vertebrae. Iliacus fills the iliac fossa.','Psoas major and iliacus join distally at the lesser trochanter, where they act together to flex the hip. Trace the muscles back to their separate nerve supply: anterior rami to psoas major and the femoral nerve to iliacus. The diaphragm forms the superior partition and receives phrenic motor supply from C3–C5.'],
    remember:['Quadratus lumborum connects iliac crest to 12th rib.','Iliacus and psoas major share an insertion and action. Their nerve supplies differ.'],
    trap:'A shared tendon does not imply a shared nerve supply.',
    checks:[['Which component of iliopsoas receives the femoral nerve?',['Iliacus','Psoas major','Quadratus lumborum','Diaphragm'],['Iliacus receives the femoral nerve and joins psoas at the lesser trochanter.','Psoas major receives direct branches from lumbar anterior rami.','Quadratus lumborum is a posterior wall muscle outside iliopsoas.','The diaphragm is a respiratory muscle and is not part of iliopsoas.']],
     ['Which posterior wall muscle fixes the 12th rib while the diaphragm contracts?',['Quadratus lumborum','Iliacus','Psoas major','Rectus abdominis'],['Its attachment to the 12th rib lets quadratus lumborum stabilize it.','Iliacus lies in the iliac fossa and acts at the hip.','Psoas major runs from the vertebrae to the lesser trochanter.','Rectus abdominis is in the anterior abdominal wall.']]]},
   {key:'aorta',title:'Diaphragmatic openings and aortic branches',pages:[8,10,11,12,13,14,15,17,18,19],
    body:['Use the vertebral levels as landmarks. The IVC crosses the diaphragm at T8, the esophagus at T10 and the aorta at T12. The abdominal aorta descends in front of the vertebral column and divides into the common iliac arteries at L4.','Classify the branches by their territory. The celiac trunk, SMA and IMA are unpaired gut arteries. The renal, middle suprarenal and gonadal arteries are paired visceral branches. Lumbar arteries supply the body wall. The right renal artery travels behind the IVC on its way to the right kidney.'],
    remember:['T8 IVC, T10 esophagus, T12 aorta.','Celiac T12, SMA L1, IMA L3, aortic bifurcation L4.'],
    trap:'The renal arteries are paired visceral branches. Do not group them with unpaired gut arteries.',
    checks:[['Which vessel typically leaves the anterior aorta at L1?',['Superior mesenteric artery','Inferior mesenteric artery','Celiac trunk','Median sacral artery'],['The SMA arises at L1.','The IMA arises lower, at L3.','The celiac trunk arises near T12.','The median sacral artery is a small posterior branch near the bifurcation.']],
     ['What lies anterior to the right renal artery as it travels toward the kidney?',['Inferior vena cava','Psoas major','Aortic hiatus','Right crus posterior to the artery'],['The right renal artery passes posterior to the IVC.','Psoas major contributes to the posterior bed of the kidney.','The hiatus is the superior passage of the aorta at T12.','A structure posterior to the artery cannot be its anterior relation.']]]},
   {key:'aneurysm',title:'Abdominal aortic aneurysm',pages:[10,15,16],
    body:['An aneurysm is a localized dilation of the vessel. The lecture’s typical example lies below the renal arteries and just above the L4 bifurcation. On a diagram, first identify the common iliac arteries and trace them upward until they join.','Distinguish an infrarenal aortic dilation from a branch lesion by checking whether the widened segment is part of the midline trunk or one of its paired branches.'],
    remember:['Locate the lesion in relation to the renal arteries and iliac bifurcation.'],
    checks:[['A focal dilation lies just above the common iliac origins and below both renal arteries. Where is it?',['Infrarenal aorta','Celiac trunk','Right common iliac artery','Suprarenal aorta'],['The involved segment is the aortic trunk below the renal origins.','The celiac trunk branches off much more superiorly.','The right common iliac begins below the specified dilation.','A suprarenal dilation would lie above the renal origins.']]]},
   {key:'ivc',title:'IVC formation and asymmetric tributaries',pages:[21,22,23,24,25],
    body:['The common iliac veins unite at L5. The IVC ascends to the right of the aorta and passes into the thorax through the diaphragm. Renal veins enter the IVC, but their lengths differ because the cava is right of the midline.','The left renal vein crosses anterior to the aorta and receives the left gonadal and left suprarenal veins. On the right these veins enter the IVC directly. Trace the left gonadal vein into the left renal vein before following blood into the cava.'],
    remember:['Aorta divides at L4. IVC forms at L5.','Left gonadal and suprarenal veins reach the IVC through the left renal vein.'],
    checks:[['What vessel immediately receives the left testicular vein?',['Left renal vein','Inferior vena cava','Left common iliac vein','Splenic vein'],['It enters the left renal vein, which then drains into the IVC.','The right testicular vein normally drains directly into the IVC.','The common iliac veins unite to form the IVC below this level.','The splenic vein is part of the portal venous system.']],
     ['Why is the left renal vein longer than the right?',['It crosses the midline to reach the right-sided IVC','It continues directly as the portal vein','It passes through the esophageal hiatus','It loops behind the left ureter to enter the left common iliac vein'],['The left renal vein crosses anterior to the aorta to reach the cava.','Renal veins drain into the systemic venous system.','The renal vein remains in the abdomen.','The left renal vein drains to the IVC.']]]},
  ]},
 {code:'A2',title:'Posterior abdominal wall II',source:'posterior-wall-2',file:'posterior-wall-2.pdf',unit:'page',group:'Anatomy',
  overview:'Use psoas major as a landmark for the lumbar plexus, then follow each branch to its motor or sensory territory.',
  objectives:['Locate the lumbar plexus and follow its branches and territories.','Trace posterior wall, visceral and renal lymph drainage.'],
  topics:[
   {key:'landmarks',title:'Lumbar plexus and psoas landmarks',pages:[3,4,5,6,7,8],
    body:['The lumbar plexus forms within psoas major from the anterior rami of L1–L4. Distinguish nerves by where they emerge. The genitofemoral nerve emerges on the anterior surface. More lateral branches include the iliohypogastric, ilioinguinal and lateral femoral cutaneous nerves.','The ilioinguinal nerve traverses part of the inguinal canal. The lateral femoral cutaneous nerve crosses iliacus toward the anterior superior iliac spine and supplies skin of the lateral thigh. It does not provide quadriceps motor function.'],
    remember:['Genitofemoral: on the anterior surface of psoas.','Lateral femoral cutaneous: sensory, lateral thigh.'],
    checks:[['Which branch emerges directly on the anterior surface of psoas major?',['Genitofemoral','Obturator','Femoral','Ilioinguinal'],['This is the defining surface relation shown in the source diagram.','The obturator nerve emerges medially.','The femoral nerve emerges laterally and follows the interval beside iliacus.','The ilioinguinal nerve is a lateral branch traveling toward the inguinal region.']],
     ['A lesion near the ASIS causes lateral thigh numbness without quadriceps weakness. Which nerve best fits?',['Lateral femoral cutaneous','Femoral','Obturator','Iliohypogastric'],['It is a sensory nerve passing near the ASIS.','A femoral lesion can weaken knee extension.','The obturator nerve serves the medial thigh and adductors.','Iliohypogastric territory is primarily lower abdominal wall and adjacent skin.']]]},
   {key:'thigh',title:'Femoral versus obturator nerve',pages:[9,10],
    body:['Both nerves carry fibers from L2–L4, so identify them by their courses and deficits. The femoral nerve travels laterally beside psoas and passes beneath the inguinal ligament into the anterior thigh. The obturator nerve emerges medially at the pelvic brim and enters the thigh through the obturator canal.','The femoral nerve supplies anterior thigh muscles, including the quadriceps. The obturator nerve supplies much of the medial thigh adductor compartment.'],
    remember:['Femoral: anterior thigh and knee extension.','Obturator: through the obturator canal to the adductor compartment.'],
    checks:[['Which nerve is most directly implicated by weak thigh adduction after injury near the obturator canal?',['Obturator','Femoral','Lateral femoral cutaneous','Genitofemoral'],['The obturator nerve passes through this canal and supplies most thigh adductors.','The femoral nerve passes beneath the inguinal ligament.','The lateral femoral cutaneous nerve is sensory.','The genitofemoral nerve crosses psoas anteriorly and does not innervate thigh adductors.']],
     ['What best distinguishes the femoral nerve from the obturator nerve?',['The femoral nerve continues under the inguinal ligament','Only the femoral nerve has L2 fibers','The femoral nerve enters the obturator canal','The femoral nerve supplies only lateral thigh skin'],['Their paths separate at the pelvic brim. The femoral nerve then passes under the inguinal ligament.','Both nerves can carry L2 fibers.','The obturator nerve enters that canal.','The femoral nerve has substantial motor supply to the anterior thigh.']]]},
   {key:'lymph',title:'Lumbar nodes and renal lymph drainage',pages:[12,13,14,15,16],
    body:['Organize posterior abdominal lymph nodes by drainage territory. Lumbar nodes alongside the great vessels receive lymph from posterior wall structures and paired retroperitoneal organs. Pre-aortic groups associated with gut arteries drain parts of the gastrointestinal tract.','The kidney, suprarenal gland and abdominal ureter drain toward lumbar nodes. Follow this route independently of renal venous drainage. The lumbar trunks converge near the cisterna chyli at L1–L2, where the thoracic duct begins.'],
    remember:['Renal lymph goes to lumbar nodes. Gut drainage follows celiac and mesenteric territories.'],
    checks:[['Which nodes are the initial regional group for renal lymph?',['Lumbar nodes','Superficial inguinal nodes','Inferior mesenteric nodes','Axillary nodes'],['The lumbar nodes along the great vessels receive renal lymph.','Superficial inguinal nodes receive superficial drainage from other territories.','The inferior mesenteric group drains hindgut territory.','Axillary nodes are unrelated to renal lymph drainage.']]]},
  ]},
 {code:'A3',title:'The anatomy of the kidney I',source:'kidneys',file:'kidneys.pdf',unit:'page',group:'Anatomy',
  overview:'Orient the kidney in the body and on a specimen. Trace the vessels and urine separately, then use the coverings and collecting system to explain common clinical findings.',
  objectives:['Orient the kidneys and describe their positions and relations.','Trace the coverings, sinus, collecting system and blood supply.','Explain the anatomy of perinephric abscess, staghorn calculi and nephroptosis.'],
  topics:[
   {key:'orientation',title:'Orientation, topography and the hilum',pages:[4,6,7,9,10,11,12,13],
    body:['The kidneys are retroperitoneal, with the right typically lower than the left. The principal posterior muscle landmarks are diaphragm, psoas major and quadratus lumborum. Anterior relations differ on the two sides: the second part of the duodenum is a right-sided relation and the spleen a left-sided relation.','On a specimen, the hilum faces medially. At the hilum read from anterior to posterior: renal vein, renal artery, renal pelvis. Through the hilum you reach the renal sinus. The sinus is the space containing the collecting structures, vessels and surrounding tissue.'],
    remember:['Hilum order from anterior: vein, artery, pelvis.','Use side-specific organ relations to identify right and left.'],
    checks:[['Which structure occupies the most posterior position at the typical renal hilum?',['Renal pelvis','Renal artery','Renal vein','Second part of the duodenum'],['The renal pelvis lies posterior to the artery.','The artery normally lies between vein and pelvis.','The renal vein is the anterior hilar structure.','The duodenum can be an anterior relation of the right kidney but is not a hilar content.']],
     ['Which organ is a typical anterior relation of the left kidney?',['Spleen','Liver','Second part of the duodenum','Right colic flexure'],['The spleen relates to the anterior surface on the left.','The right lobe of the liver relates to the right kidney.','The descending duodenum relates to the right kidney.','The right colic flexure relates to the right kidney.']]]},
   {key:'coverings',title:'How the renal coverings define the perinephric space',pages:[14,15,16,17,18],
    body:['The fibrous capsule is directly on the kidney. Perirenal fat surrounds the capsule, and renal fascia encloses the perirenal compartment. Keep perirenal fat distinct from fat outside that fascia.','An ascending infection can reach the kidney and extend into the surrounding perirenal compartment, producing a perinephric abscess. On a cross-section, identify the fascia first. An abscess can track along psoas. Superior spread can irritate the diaphragm and refer pain to the shoulder through the phrenic nerve.'],
    remember:['From inside outward: capsule, perirenal fat, renal fascia.','Perinephric means around the kidney in its surrounding compartment.'],
    checks:[['Which layer directly contacts the renal parenchyma?',['Fibrous capsule','Renal fascia','Perirenal fat','Pararenal fat'],['The capsule closely invests the kidney surface.','The fascia is external to the perirenal fat.','Perirenal fat lies outside the capsule.','Pararenal fat lies outside the renal fascia.']],
     ['A collection surrounds the kidney within the renal fascia. Which space is involved?',['Perinephric space','Renal pelvis','Bowman space','Pararenal space outside the fascia'],['The renal fascia encloses the perinephric compartment.','The pelvis is the collecting funnel inside the sinus.','Bowman space receives filtrate in a renal corpuscle.','Pararenal tissue lies outside the fascia.']]]},
   {key:'circulation',title:'Cortex, medulla and renal circulation',pages:[19,20,21,23,24,25,26],
    body:['The cortex is the outer band and extends inward as renal columns between medullary pyramids. Follow the vascular tree from renal artery to segmental and lobar branches, then to interlobar arteries between pyramids. Arcuate branches run along the corticomedullary border. Cortical radiate arteries run from there into the cortex.','The arterial segments are useful surgical landmarks because segmental branches supply distinct territories. The vascular sequence ends at small vessels delivering blood to the nephron, whereas the collecting system conveys urine in the opposite overall direction toward the hilum.'],
    remember:['Interlobar arteries run between pyramids. Arcuate arteries curve along their bases.'],
    checks:[['Which arteries curve along the bases of the medullary pyramids?',['Arcuate arteries','Interlobar arteries','Cortical radiate arteries','Segmental arteries'],['Arcuate arteries arch at the corticomedullary junction.','Interlobar arteries ascend between pyramids in the columns.','Cortical radiate arteries leave arcuate branches and run into cortex.','Segmental arteries are proximal branches of the renal artery.']],
     ['What is the cortical tissue between adjacent pyramids called?',['Renal column','Renal papilla','Renal pelvis','Minor calyx'],['Renal columns are extensions of cortex between pyramids.','The papilla is the apex of a pyramid.','The pelvis is a urine collection funnel.','A minor calyx cups a papilla.']]]},
   {key:'outflow',title:'Calyces, staghorn stones and nephroptosis',pages:[21,22,27,28,29,30],
    body:['A papilla drains into a minor calyx. Minor calyces join into major calyces, then the renal pelvis funnels urine to the ureter. A staghorn stone branches through the collecting system and can occupy the pelvis as well as its calyces.','Nephroptosis describes abnormal downward movement of the kidney on standing. In a comparative image, distinguish a kidney moving as an organ from a stone moving within its collecting system.'],
    remember:['Papilla → minor calyx → major calyx → pelvis → ureter.','Staghorn describes a branching stone. Nephroptosis describes abnormal renal descent.'],
    checks:[['Where does urine go immediately after leaving the renal papilla?',['Minor calyx','Major calyx','Renal pelvis','Ureter'],['A minor calyx directly cups the papilla.','A major calyx collects from multiple minor calyces.','The renal pelvis is downstream of the major calyces.','The ureter begins beyond the pelvis.']],
     ['What finding most directly supports nephroptosis?',['The whole kidney descends abnormally when the patient stands','A calculus branches from the renal pelvis into the calyces','A collection is confined within renal fascia','A minute stone appears within a minor calyx'],['An abnormal change in renal position with standing characterizes nephroptosis.','This describes a staghorn stone.','This describes a process affecting the perinephric compartment.','This is an intrarenal calculus without evidence of positional descent.']]]},
  ]},
 {code:'A5',title:'Histological organization of the kidney',source:'kidney-histology-1',file:'kidney-histology-1.pptx',unit:'slide',group:'Histology',
  overview:'Read a renal section from low power to high power. Locate the corpuscles, identify the surrounding tubules, then follow filtrate from Bowman space to the papilla.',
  objectives:['Describe the microscopic organization of the kidney.','Trace urine through the microscopic tubules and into the collecting system.','Recognize tubule and collecting-duct profiles by epithelium and location.'],
  topics:[
   {key:'map',title:'Cortex, medulla and the cortical lobule',pages:[3,4,7,13,15,17,21],
    body:['Start with the location of renal corpuscles. A corpuscle identifies cortex, even if straight tubule profiles are in the same field. The cortical labyrinth contains corpuscles and convoluted tubules. Adjacent medullary rays are bundles of straight tubules and collecting ducts that extend into the cortex.','At a larger scale, a pyramid plus its associated cortex forms a renal lobe. The cortical lobule is a smaller organizational unit around a medullary ray. The true medulla lacks renal corpuscles.'],
    remember:['Corpuscles mark cortex. Medullary rays can also be in cortex.'],
    checks:[['A field contains aligned straight tubules beside renal corpuscles. Which region is it?',['Renal cortex with a medullary ray','Renal medulla near the papilla','Minor calyx','Renal pelvis'],['The corpuscles locate the field in cortex. Rays account for the straight profiles.','True medulla does not contain renal corpuscles.','A minor calyx is a urothelium-lined cavity, not a corpuscle-containing field.','The renal pelvis is a macroscopic collecting region.']],
     ['A renal lobe contains which components?',['A medullary pyramid and its associated cortex','One glomerulus and one proximal tubule','One medullary collecting duct','One minor and one major calyx only'],['The pyramid and its associated cortex define the lobe.','These are elements of a nephron.','One collecting duct is smaller than a lobe.','Calyces convey urine and do not define the parenchymal lobe.']]]},
   {key:'corpuscle',title:'Renal corpuscle and the start of urine flow',pages:[6,9,10,14],
    body:['The glomerulus is a capillary tuft inside Bowman capsule. The visceral layer consists of podocytes closely applied to the capillary surface. The parietal layer is simple squamous epithelium. Filtrate crosses from the capillaries into the capsular space and then enters the proximal tubule at the urinary pole.','Identify the vascular pole by the arterioles and the urinary pole by continuity between capsular space and proximal tubule. Blood stays in vascular profiles and filtrate enters the tubular lumen.'],
    remember:['Visceral: podocytes. Parietal: simple squamous.','Urinary pole continues into the proximal tubule.'],
    checks:[['Which cells form the visceral layer of Bowman capsule?',['Podocytes','Parietal squamous cells','Principal cells','Intercalated cells'],['Podocytes cover the capillary tuft on the filtration side.','Parietal squamous cells line the outer capsule.','Principal cells are found in collecting ducts.','Intercalated cells participate in acid–base regulation in collecting ducts.']],
     ['At the urinary pole, capsular space is continuous with what?',['Proximal tubule lumen','Afferent arteriole','Efferent arteriole','Minor calyx'],['Filtrate leaves the capsular space through the proximal tubule.','The afferent vessel carries blood into the tuft at the vascular pole.','The efferent vessel carries blood out of the tuft.','The minor calyx receives urine much farther downstream.']]]},
   {key:'tubules',title:'Distinguishing proximal, distal and thin segments',pages:[7,9,15,16,17,20,21],
    body:['In the cortical labyrinth, compare nearby tubules instead of using stain intensity alone. The proximal convoluted tubule has a prominent brush border, giving some profiles a fuzzy or irregular lumen. Distal convoluted tubules lack that prominent border and commonly appear to have a cleaner lumen.','A thin limb has flattened simple squamous lining. When distinguishing it from a small vessel, consider the profile location and whether erythrocytes are present. Trace the sequence from the proximal tubule through the loop and distal tubule to the collecting system.'],
    remember:['Proximal: prominent brush border. Distal: clearer lumen. Thin limb: squamous lining.'],
    checks:[['Which feature most directly favors a proximal over a distal convoluted tubule?',['Prominent apical brush border','A flat squamous lining','Urothelium','Location exclusively in the papilla'],['The apical brush border is a key proximal-tubule clue.','Squamous lining suggests a thin segment or vascular profile.','Urothelium lines the outflow tract beyond the papilla.','Both proximal and distal convoluted profiles are found in cortex.']],
     ['Which epithelium lines the thin limb of the nephron loop?',['Simple squamous','Stratified squamous','Pseudostratified columnar','Transitional'],['Thin limbs have flat simple squamous epithelium.','A multilayered squamous lining is not characteristic here.','Pseudostratified columnar is not the thin-limb lining.','Transitional epithelium belongs to the urinary outflow tract.']]]},
   {key:'ducts',title:'Collecting ducts, papilla and minor calyx',pages:[8,11,18,19,21,22,23,24],
    body:['Collecting ducts join in the medulla and converge as papillary ducts of Bellini. Compare the clearer boundaries of collecting-duct cells with adjacent tubule profiles. Principal cells participate in sodium and water handling and respond to ADH. Intercalated cells contribute to acid–base regulation.','At the papilla the papillary ducts deliver urine to a minor calyx. This is a useful boundary between microscopic collecting ducts and a macroscopic lumen with urothelium.'],
    remember:['ADH-sensitive collecting-duct cells are principal cells.','Papillary ducts empty into a minor calyx lined by urothelium.'],
    checks:[['Which collecting-duct cells respond to ADH to increase water permeability?',['Principal cells','Podocytes','Parietal cells of Bowman capsule','Macula densa cells'],['Principal cells respond to ADH in the collecting system.','Podocytes are filtration-barrier cells.','Parietal cells contribute to the walls of Bowman capsule.','Macula densa cells sense tubular salt delivery.']],
     ['Which lining identifies the minor calyx beyond the papillary ducts?',['Urothelium','Fenestrated endothelium','Proximal-tubule brush border','Podocytes'],['The minor calyx is part of the urothelium-lined outflow system.','Endothelium lines blood vessels.','Brush border identifies proximal tubule epithelium.','Podocytes form the visceral lining of Bowman capsule.']]]},
  ]},
];

export const renalLessons=[...renalAnatomy,...renalPhysiology];
const lessonChecks=(entry,topic)=>[...topic.checks,...(anatomyChecks[entry.code+'-'+topic.key]||[])];
const bookletSource={
 id:'ren123-booklet-source',name:'REN 123 Past Paper Booklet.pdf',kind:'Past questions',
 unit:'page',url:'/api/site-assets/materials/ren123/past-paper-booklet.pdf',pages:[],
};
export function validateRenalLessons(entries=renalLessons){
 const expected=courses.REN.lectureCodes,seen=new Set();
 for(const entry of entries){
  if(!entry?.code||!expected.includes(entry.code)||seen.has(entry.code))throw Error('Invalid or duplicate REN lesson code: '+String(entry?.code));
  seen.add(entry.code);
  if(!Array.isArray(entry.objectives)||!entry.objectives.length||!Array.isArray(entry.topics)||!entry.topics.length)throw Error('REN-'+entry.code+' has no objectives or teaching topics.');
  const keys=new Set();
  for(const section of entry.topics){
   if(!section.key||keys.has(section.key)||!section.body?.length||!section.pages?.length||!section.pages.every(p=>Number.isInteger(p)&&p>0))throw Error('REN-'+entry.code+' has incomplete or duplicate topic '+String(section.key));
   keys.add(section.key);
   const checks=lessonChecks(entry,section),stems=new Set(checks.map(q=>String(q[0]||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()).filter(Boolean));
   if(stems.size<5)throw Error('REN-'+entry.code+' '+section.key+' needs at least five distinct core questions.');
  }
 }
 for(const code of expected)if(!seen.has(code))throw Error('Missing registered REN lesson: REN-'+code);
 return entries;
}
export function renalTeachingPack(entries=renalLessons) {
 validateRenalLessons(entries);
 const items=[], sources=[bookletSource], lessons=[], guides={}, questions=[];
 for(const entry of entries){
  const id='REN-'+entry.code,source='ren123-'+(entry.code==='P4'?'p4-':'')+entry.source;
  const cite=page=>({source,page});
  items.push({id,code:entry.code,course:'REN',title:entry.title,group:entry.group,dates:[]});
  sources.push({id:source,name:entry.title+' · REN 123',kind:'Original lecture',unit:entry.unit,url:'/api/site-assets/materials/ren123/'+entry.file,lectureIds:[id],pages:[]});
  const sections=entry.topics.map(topic=>{
   const concept=id+'-'+topic.key, references=topic.pages.map(cite);
   lessonChecks(entry,topic).forEach(([question,...choices],i)=>{
    const original=Array.isArray(choices[0]);
    const pairs=original?choices[0].map((choice,n)=>[choice,choices[1][n]]):choices.slice(0,4).map(choice=>choice.split('|'));
    const fromBooklet=original?null:choices[4], sourcePage=fromBooklet?.match(/-p(\d+)-/)?.[1];
    const order=pairs.map((_,n)=>(n+i+topic.key.length)%pairs.length), answer=order.indexOf(0);
    const citations=sourcePage?[{source:bookletSource.id,page:Number(sourcePage)},...references]:references;
    questions.push({id:concept+'-check-'+(i+1),lectureIds:[id],
     kind:sourcePage?'Past paper · adapted from Renal Booklet':'Application check · authored from slides',
     ...(sourcePage?{adaptedFromBookletId:fromBooklet,adaptationNote:'Adapted for guided practice from the Renal booklet, page '+sourcePage+'. The booklet retains the original item.'}:{}),
     difficulty:'medium',concept,question,options:order.map(n=>pairs[n][0]),answer,explanation:pairs[0][1],reasons:order.map(n=>pairs[n][1]),references:citations});
   });
   return {id:concept,concept,title:topic.title,body:topic.body,keyPoints:topic.remember,pitfalls:topic.trap?[topic.trap]:[],references};
  });
  guides[id]={overview:entry.overview,objectives:entry.objectives,sections,summary:entry.topics.flatMap(t=>t.remember)};
  lessons.push({id,scope:entry.overview,references:[cite(entry.code==='A5'?1:2)],facts:sections.map(t=>({id:t.id,concept:t.title,prompt:'Explain '+t.title.toLowerCase()+'.',answer:t.keyPoints.join(' '),teach:t.body.join(' '),references:t.references}))});
 }
 return {items,sources,lessons,guides,questions};
}
