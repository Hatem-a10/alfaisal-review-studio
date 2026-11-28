import {renalTbl1Applications} from './renal-tbl1-applications.mjs';

const [filtrationReview, calculations, anatomyReview] = renalTbl1Applications;
const answer = (question, correct, ...distractors) => ({question, choices:[correct,...distractors]});
const [histology, filtration, vessels, plexus, lymph, kidney, myogenic, mediators] = [
 'Describe the histology of the nephron and collecting duct system',
 'Describe the histology of the filtration membrane',
 'Describe the anatomy of major vessels (aorta and IVC) in the posterior abdominal wall.',
 'Describe the lumbar plexus in the posterior abdominal wall.',
 'Describe lymphatics in the posterior abdominal wall.',
 'Describe the anatomy of the kidney.',
 'Explain the myogenic mechanism of renal blood flow autoregulation.',
 'Identify the sites of action of various factors on renal blood vessels.',
];
const ids=(prefix,...numbers)=>numbers.map(number=>prefix+'-'+number);
const from=(code,...groups)=>groups.flatMap(([topic,...numbers])=>ids('REN-'+code+'-'+topic,...numbers));
const refs=(...groups)=>groups.flatMap(([source,...pages])=>pages.map(page=>({source:'ren123-'+source,page})));
const fig=(source,page,file,caption)=>({source:'ren123-'+source,page,image:'/api/site-assets/materials/ren123/'+file,caption});
const authored=(rows,indexes)=>indexes.map(i=>{const [question,options,reasons]=rows[i-1];return answer(question,...options.map((option,index)=>[option,reasons[index]]));});

const units=[
 {
  key:'nephron-histology', title:'Nephron and collecting duct histology', objective:histology,
  references:refs(['kidney-histology-1',14,17,23],['kidney-histology-2',10,20,21,22,25,26,27],['kidney-functions',5,6],['renal-clearance',3,4,5]),
  figure:fig('kidney-histology-1',17,'kidney-histology-1-p17.jpg','Use epithelial shape, brush border and lumen outline to distinguish renal tubular profiles.'),
  body:[
   'Locate the region before identifying a tubule. Corpuscles and convoluted tubules are in the cortical labyrinth. Medullary rays are in the cortex and contain straight tubules and collecting ducts. The medulla has loops, vasa recta and collecting ducts, with no renal corpuscles. At the corticomedullary junction, arcuate vessels curve along the pyramid bases.',
   'Trace filtrate through the proximal convoluted then straight tubule, thin limb segments, thick ascending limb, distal convoluted tubule, connecting tubule and collecting ducts. Proximal cells are cuboidal, eosinophilic and rich in mitochondria. Long microvilli make the lumen look fuzzy or partly filled. Distal profiles have fewer microvilli, a clearer lumen and often more visible nuclei per profile. The thin limb is simple squamous. Red cells within a narrow flat-lined profile favor vasa recta over a thin limb.',
   'Collecting ducts have a relatively regular lumen and distinct cell boundaries. Pale principal cells handle Na⁺, K⁺ and ADH-dependent water movement. Intercalated cells are darker and mitochondria-rich. They regulate acid–base balance. The terminal papillary ducts of Bellini become taller and empty at the papilla into the minor calyx, where urothelium begins.',
   'Apply the histology to transport. A proximal lesion can impair normally substantial glucose reabsorption. With filtration of 300 mg/min and excretion of 30 mg/min, net reabsorption is 270 mg/min. Glucose in urine is compatible with net reabsorption.',
  ],
  remember:['Dirty lumen and brush border suggest PCT. Clean lumen without a brush border favors DCT.', 'Thin limbs and capillaries have flat linings. Look for red cells and inspect neighboring structures.', 'Collecting ducts have clear cell borders, pale principal cells and darker intercalated cells.'],
  earlier:[...from('A5',['map-check',1,4],['tubules-check',2,3,5],['ducts-check',1,2,3,4])],
  added:[...authored(filtrationReview.checks,[2]),...authored(calculations.checks,[2])],
 },
 {
  key:'filtration-membrane', title:'Filtration membrane and glomerular injury', objective:filtration,
  references:refs(['kidney-histology-2',7,10,13,14],['gfr-renal-blood-flow',3,4,6,9,10,12,16,17]),
  figure:fig('gfr-renal-blood-flow',4,'gfr-renal-blood-flow-p4.jpg','Follow water from the capillary lumen across the three layers into Bowman space.'),
  body:[
   filtrationReview.body[0],
   'Endothelium contains fenestrae and an endothelial surface layer. The shared basement membrane and slit diaphragms are formed between the endothelial and podocyte faces. Nephrin helps form the diaphragm spanning adjacent foot processes. Parietal squamous cells line Bowman capsule away from the tuft. The basement membrane restricts macromolecules, while podocyte foot processes and the slit diaphragm help preserve selectivity.',
   'Small free solutes cross readily. Cells and most albumin stay in blood. A damaged barrier can leak protein, and a more severe lesion can allow blood into urine. Size and molecular properties influence passage. The lecture uses an equal-size charged-dextran comparison to illustrate how loss of normal charge selectivity can favor albumin leakage.',
   filtrationReview.body[1],filtrationReview.body[2],
  ],
  remember:['Endothelium → basement membrane → slit diaphragm → Bowman space.', 'The filtration coefficient combines available area with hydraulic permeability.', 'An obstructed ureter raises Bowman-space hydrostatic pressure. Glomerular inflammation can lower Kf.'],
  earlier:[...from('A5',['corpuscle-check',3]),...from('A6',['filtration-flow-review',1,2]),...from('P3',['barrier-check',1,2,3,4],['forces-check',1,3,5])],
  added:authored(filtrationReview.checks,[1,3,4,5]),
 },
 {
  key:'aorta-ivc', title:'Abdominal aorta and inferior vena cava', objective:vessels,
  references:refs(['posterior-wall-1',8,10,11,12,13,14,15,16,21,22,23,24,25]),
  figure:fig('posterior-wall-1',24,'posterior-wall-1-p24.jpg','Compare the entry of left and right gonadal and suprarenal veins.'),
  body:[
   'On an anterior view, find the aorta anterior to the vertebral bodies and the IVC to its right. The aorta enters through the aortic hiatus at T12 and divides at L4 into common iliac arteries. The common iliac veins unite around L5 to form the IVC, which reaches the thorax through the caval opening at T8. The esophagus passes through at about T10.',
   'Learn branches by destination. The celiac trunk is a foregut vessel near T12, the SMA is a midgut vessel near L1, and the IMA is a hindgut vessel near L3. Paired renal, gonadal and middle suprarenal branches supply viscera. Lumbar arteries supply the wall. The right renal artery takes a longer path and passes behind the IVC. The left renal vein crosses in front of the aorta and beneath the SMA.',
   'The left gonadal and left suprarenal veins usually enter the left renal vein, then reach the IVC. Their right counterparts usually go directly into the IVC. Compression of the left renal vein between SMA and aorta can obstruct left-sided venous drainage. On an infrarenal aneurysm image, use the renal artery origins and iliac bifurcation to establish the affected segment.',
  ],
  remember:['IVC T8, esophagus T10, aorta T12.', 'Aorta divides near L4. IVC begins near L5.', 'Right renal artery goes behind the IVC. Left renal vein crosses in front of the aorta.'],
  earlier:from('A1',['aorta-check',1,2,3,4,5],['aneurysm-check',1,4,5],['ivc-check',1,2,3,4,5]),
 },
 {
  key:'lumbar-plexus', title:'Lumbar plexus and psoas landmarks', objective:plexus,
  references:refs(['posterior-wall-2',3,4,5,6,7,8,9],['posterior-wall-1',4,5,6,7]),
  figure:fig('posterior-wall-2',4,'posterior-wall-2-p4.jpg','Orient the plexus branches by where they emerge from psoas major.'),
  body:[
   'The lumbar plexus forms mainly from anterior rami L1–L4 within psoas major, with a possible T12 contribution. Find psoas beside the lumbar vertebrae. The genitofemoral nerve (L1–L2) pierces it and runs down its anterior surface. The iliohypogastric and ilioinguinal nerves pass out laterally. The latter is classically L1 and traverses part of the inguinal canal. Its cutaneous territory includes part of the upper medial thigh and external genital region.',
   'The lateral femoral cutaneous nerve (L2–L3) crosses iliacus toward the ASIS and supplies lateral thigh skin. The femoral nerve (L2–L4) emerges laterally and runs between psoas and iliacus beneath the inguinal ligament. A lesion can weaken knee extension and blunt the patellar reflex. The obturator nerve (L2–L4) leaves the medial side of psoas and exits through the obturator canal. A lesion weakens hip adduction.',
   'Localize from motor plus sensory signs. Lateral thigh numbness with intact knee extension favors lateral femoral cutaneous injury. Inguinal and upper medial thigh symptoms can favor ilioinguinal injury. The phrenic nerve (C3–C5) is from the cervical region. It explains shoulder referral from the diaphragm in the recalled case.',
  ],
  remember:['Genitofemoral is on the front of psoas. Femoral exits laterally. Obturator exits medially.', 'Ilioinguinal is classically L1. Lateral femoral cutaneous is sensory.', 'Use knee extension for femoral injury and adduction for obturator injury.'],
  earlier:from('A2',['landmarks-check',1,2,3,4,5],['thigh-check',1,2,3,4,5]),
 },
 {
  key:'posterior-lymphatics', title:'Posterior abdominal lymphatics', objective:lymph,
  references:refs(['posterior-wall-2',11,12,13],['kidneys',11,17,18]),
  figure:fig('posterior-wall-2',13,'posterior-wall-2-p13.jpg','Compare lateral aortic and preaortic drainage territories around the major vessels.'),
  body:[
   'Separate the nodes beside the aorta from those in front of it. The lateral aortic or lumbar nodes receive lymph from the kidneys, posterior abdominal wall and gonads. Renal lymphatics leave the hilum with the renal vessels. Regional spread from a renal malignancy therefore points first to lumbar nodes. Gonadal lymph follows gonadal vessels back toward the abdomen. Superficial drainage of scrotal skin instead goes to superficial inguinal nodes.',
   'The preaortic celiac, superior mesenteric and inferior mesenteric groups receive lymph from foregut, midgut and hindgut territories respectively. These follow the corresponding arterial origins. Pelvic lymph can pass through iliac nodes on its way toward the lumbar chain. Keep the name of the organ and its vascular pedicle in view when identifying first-echelon drainage.',
   'Efferent vessels of lumbar nodes form right and left lumbar trunks. Together with intestinal drainage, they can enter an enlarged cisterna chyli around the upper lumbar level, then the thoracic duct. A distinct cisterna chyli varies between people. A site of collection and a first regional node are different points on this path.',
  ],
  remember:['Kidney → hilar lymphatics → lumbar nodes → lumbar trunks.', 'Gut territories drain toward their preaortic arterial node groups.', 'The thoracic duct receives abdominal lymph after regional nodal drainage.'],
  earlier:from('A2',['lymph-check',1,2,3,4]),
  added:[
   answer('A retroperitoneal mass obstructs the lymphatics accompanying the renal artery just outside the hilum. Which node group is normally next?', ['Lumbar nodes','Renal lymph travels from the hilum toward nodes beside the aorta.'],['Celiac nodes','These mainly drain foregut territories.'],['Superficial inguinal nodes','These receive superficial territories such as scrotal skin.'],['Mesorectal nodes','These are regional to the rectum.']),
   answer('Which regional drainage best fits the gonad itself?', ['Lumbar nodes via routes accompanying the gonadal vessels','The gonad retains a retroperitoneal drainage route.'],['Superficial inguinal nodes via scrotal skin','This describes skin drainage.'],['Inferior mesenteric nodes via the hindgut arteries','Those nodes chiefly serve hindgut territories.'],['Celiac nodes via the splenic artery','That route relates to foregut territory.']),
   answer('A colon lesion involves the foregut–midgut–hindgut map. Which node and territory pairing is correct?', ['Superior mesenteric nodes and midgut','The nodes follow the SMA and its midgut branches.'],['Celiac nodes and hindgut','The celiac group serves foregut territories.'],['Inferior mesenteric nodes and foregut','The IMA group serves hindgut territories.'],['Lumbar nodes and proximal small bowel as its first bowel nodes','Small bowel lymph first follows its mesenteric routes.']),
   answer('Which description best distinguishes lateral aortic from preaortic nodes on an anterior diagram?', ['Lateral aortic nodes lie beside the aorta, while preaortic groups cluster near the unpaired visceral branches','Their positions reflect different drainage territories.'],['Both groups are superficial to the inguinal ligament','These groups are retroperitoneal.'],['Lateral aortic nodes lie inside the lumen of the aorta','Lymph nodes are extravascular.'],['Preaortic nodes follow the paired gonadal arteries exclusively','The three major preaortic groups correspond to gut arteries.']),
   answer('Which route does lymph take after leaving the regional renal nodes?', ['Lumbar trunks and then the thoracic duct pathway','Efferent vessels join the lumbar lymph trunks and continue toward the thoracic duct.'],['A ureter and then the bladder','That route carries urine.'],['Renal vein and then the IVC directly','That route carries venous blood.'],['Right lymphatic duct at the renal hilum','The right lymphatic duct drains the right upper quadrant of the body.']),
   answer('Which clue favors posterior wall lymphatic drainage over hindgut drainage?', ['Nodes beside the aorta receiving vessels from the lumbar wall','Posterior wall drainage reaches the lumbar node chain.'],['Nodes around the inferior mesenteric arterial origin','These favor hindgut drainage.'],['Nodes accompanying the superior mesenteric arterial branches','These favor midgut drainage.'],['Nodes along the left gastric artery','This is foregut-associated drainage.']),
  ],
 },
 {
  key:'kidney-anatomy', title:'Kidney anatomy and the perinephric case', objective:kidney,
  references:refs(['kidneys',4,7,8,9,11,13,14,15,16,17,18,19,21,22,24],['posterior-wall-1',4,5,6,7]),
  figure:fig('kidneys',14,'kidneys-p14.jpg','Trace the coverings from the kidney surface to the perinephric and pararenal compartments.'),
  body:[
   'The kidneys are retroperitoneal. The right is generally lower because of the liver. Use the medial hilar concavity to orient a specimen. Typical anterior-to-posterior hilar order is vein, artery and renal pelvis. The sinus is the space behind the hilum. In section, columns are cortical extensions between medullary pyramids. The base of each pyramid faces cortex and the tip is the papilla.',
   'Trace urine from papillary ducts into a minor calyx, then major calyces, the renal pelvis and ureter. Trace blood from the renal artery through segmental, interlobar, arcuate and cortical radiate arteries before the afferent arteriole. Segmental vessels supply distinct territories with limited collateral flow.',
   ...anatomyReview.body.slice(0,2),
   'Use the abscess case to link compartments. State the fascial boundary, then account for symptoms using adjacent structures. Hip tracking follows the psoas course and shoulder referral points to diaphragmatic irritation. The combination calls for a spatial explanation, not only a memorized list of layers.',
  ],
  remember:['Outside the parenchyma are fibrous capsule, perinephric fat, renal fascia and then pararenal fat.', 'Hilar order from anterior to posterior is vein, artery, pelvis.', 'Renal fascia helps limit spread. Psoas major and the phrenic nerve explain the two directions of the case.'],
  earlier:[...from('A3',['orientation-check',1,2,3],['coverings-check',1,2,3],['outflow-check',1,3]),...from('A4',['section-check',1,2])],
  added:authored(anatomyReview.checks,[1,2,3]),
 },
 {
  key:'myogenic-autoregulation', title:'Myogenic control of renal blood flow', objective:myogenic,
  references:refs(['kidney-functions',11,12,13,14,15,16,17,21],['p4-gfr-renal-blood-flow',24,25,26,27,28]),
  figure:fig('kidney-functions',15,'kidney-functions-p15.jpg','Follow the resistance response to increasing and decreasing wall stretch. The response limits the change in flow caused by the initial pressure change.'),
  body:[
   'Treat the afferent arteriole as the adjustable inlet. An acute rise in transmural pressure stretches its vascular smooth muscle. Depolarization and calcium entry cause contraction. The rise in resistance helps limit the rise in renal blood flow and the pressure delivered to the glomerular capillaries. The reverse occurs with a fall in pressure within the autoregulatory range: stretch and tone fall and resistance decreases.',
   'Apply flow ≈ pressure gradient ÷ resistance. If pressure rises while tone is initially unchanged, flow would rise. Increasing resistance limits that change. If severe hypotension takes pressure below the range the kidney can compensate for, even an already dilated afferent arteriole cannot fully restore flow. Systemic sympathetic drive and angiotensin II may then take precedence.',
   'Separate the two intrinsic mechanisms. The myogenic response detects wall stretch and is rapid. Tubuloglomerular feedback detects luminal NaCl through the macula densa. High NaCl delivery favors ATP and adenosine signaling and an increase in afferent tone. Low NaCl delivery reduces that constrictor signal and can promote renin release. The two mechanisms can act together.',
  ],
  remember:['Higher stretch → afferent smooth muscle contracts → higher inlet resistance.', 'Less stretch → lower tone, within the autoregulatory range.', 'The macula densa detects NaCl delivery. It is a distinct sensor from the vessel wall.'],
  earlier:[...from('P1',['flow-check',1],['signals-check',4]),...from('P4',['feedback-check',1,2,3,4]),...from('P4',['tone-check',1])],
  added:[
   answer('An isolated perfused kidney has its arterial pressure increased within the autoregulatory range. Which response can still occur without sympathetic nerves?', ['Afferent myogenic contraction','The vessel wall responds directly to increased stretch.'],['Reflex β₁ stimulation from the brainstem','The preparation lacks the intact reflex pathway.'],['Aldosterone secretion by the renal cortex','Aldosterone is made in the adrenal cortex.'],['A pressure-induced contraction of the ureter as the primary regulator','The controlling resistance is vascular.']),
   answer('What happens after a moderate drop in perfusion pressure within the myogenic operating range?', ['Afferent resistance falls','Less stretch reduces smooth muscle tone and helps sustain flow.'],['Afferent resistance rises in direct proportion','This would further reduce flow.'],['Bowman-space oncotic pressure necessarily rises','The myogenic sensor is arterial wall stretch.'],['Afferent resistance stays fixed while flow is buffered entirely by the IVC','The afferent vessel changes tone.']),
   answer('Why does flow eventually fall during profound hypotension despite autoregulation?', ['Arteriolar dilation cannot fully compensate for the low pressure gradient','The intrinsic mechanism has a limited operating range.'],['The autoregulatory range extends down to zero pressure','Flow requires a driving gradient.'],['More calcium must enter because wall stretch rises as pressure falls','Falling pressure reduces stretch in this setting.'],['Afferent dilation itself produces the fall in flow','Dilation lowers resistance and offsets part of the pressure fall.']),
  ],
 },
 {
  key:'vasoactive-factors', title:'Vasoactive factors and renal arterioles', objective:mediators,
  references:refs(['kidney-functions',7,9,10,13,16,17,18,19,20,21],['p4-gfr-renal-blood-flow',14,15,16,18],['p8-urine-concentration',19,20,21]),
  figure:fig('p4-gfr-renal-blood-flow',15,'gfr-renal-blood-flow-p15.jpg','Compare an inlet restriction with an outlet restriction and predict glomerular pressure in each.'),
  body:[
   calculations.body[0],
   'Compare vasoactive factors at their site of action. Stress-related noradrenaline constricts both arterioles through α₁ receptors, with particularly strong afferent effects. β₁ receptors on granular cells support renin secretion. Angiotensin II acts preferentially on the efferent arteriole at modest levels. At higher levels it can narrow both resistance vessels. Afferent constriction tends to lower tuft pressure. Moderate efferent constriction tends to increase it until flow limitation dominates.',
   'Adenosine is an afferent constrictor in high-salt feedback. Prostaglandins and nitric oxide oppose excessive vasoconstriction. The course describes ANP as favoring glomerular filtration through afferent dilation and relative efferent constriction. In the low-effective-volume case from P1, loss of protective prostaglandin production after NSAID use can lower glomerular pressure further.',
   'The 17th Batch paper also uses a water-clearance calculation. This is an application from the urine-concentration lecture. '+calculations.body[2],
  ],
  remember:['α₁ increases vascular tone. β₁ stimulates renin in granular cells.', 'Modest angiotensin II preferentially constricts the efferent arteriole. Very high activity can constrict both.', 'Positive free-water clearance indicates urine diluted relative to plasma.'],
  earlier:[...from('P1',['flow-check',2,3,4],['signals-check',1,2,3,5]),...from('P4',['tone-check',3,5])],
  added:authored(calculations.checks,[1,3,4,5]),
 },
];

export const renalTbl1Id = 'REN-TBL1';

export function registerRenalTbl1(pack, objectiveSource) {
 const bank = new Map(pack.questions.map(question=>[question.id,question]));
 const id = renalTbl1Id;
 const title = 'Renal TBL 1';
 const overview = 'Study the eight published TBL objectives in order. Each topic connects the original course slides to specimen recognition, mechanisms or worked examples. The recalled 17th Batch paper also contains glucose and free-water calculations, which are included as cross-lecture applications.';
 const sections = units.map(unit=>{
  const topicId = id+'-'+unit.key;
  const references = [{source:objectiveSource.id,page:1},...unit.references];
  const earlier = unit.earlier.map(questionId=>{
   const question = bank.get(questionId);
   if (!question) throw Error('Missing TBL practice question '+questionId);
   return question;
  });
  const added = (unit.added||[]).map(({question,choices},index)=>{
   const keys = choices.map((_,position)=>(position+index+unit.key.length)%choices.length);
   return {id:'applied-'+(index+1),question,difficulty:'medium',answer:keys.indexOf(0),explanation:choices[0][1],
    options:keys.map(position=>choices[position][0]),reasons:keys.map(position=>choices[position][1]),references:unit.references};
  });
  const checks = [...earlier,...added];
  if (new Set(checks.map(question=>question.question)).size<10) throw Error('TBL objective needs ten distinct questions: '+unit.key);
  for (const question of checks) {
   pack.questions.push({...question,id:topicId+'-'+question.id.replace(/^REN-/,'').toLowerCase(),
    lectureIds:[id],concept:topicId,objectiveTitle:unit.objective,
    kind:question.adaptationNote?question.kind:'Application check · TBL 1 objective'});
  }
  return {id:topicId,concept:topicId,title:unit.title,body:unit.body,keyPoints:unit.remember,
   references,figure:unit.figure,concepts:[{title:unit.title,objective:unit.objective,text:unit.remember.join(' '),references:unit.references}]};
 });
 pack.items.push({id,code:'TBL 1',course:'REN',title,group:'Team-Based Learning',dates:[]});
 pack.sources.push(objectiveSource);
 pack.guides[id] = {underDevelopment:false,overview,objectives:units.map(unit=>unit.objective),sections,summary:units.flatMap(unit=>unit.remember)};
 pack.lessons.push({id,scope:overview,references:[{source:objectiveSource.id,page:1}],
  facts:sections.map(section=>({id:section.id,concept:section.title,prompt:'Explain '+section.title.toLowerCase()+'.',
   answer:section.keyPoints.join(' '),teach:section.body.join(' '),references:section.references}))});
}
