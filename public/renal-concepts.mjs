// Ordered teaching concepts supplement existing scored topics without changing earned mastery.
const c=(key,title,objective,pages,text)=>({key,title,objective,pages,text});
export const renalConcepts={
 A1:[
  c('muscles','Muscle attachments and movement',0,[4,5,6,7],'Use the attachment to predict the action: iliopsoas crosses in front of the hip and flexes it, while quadratus lumborum fixes rib 12 and laterally flexes the trunk. Iliacus and psoas major share an insertion but differ in innervation.'),
  c('muscles','Fascia and the path of a psoas collection',0,[5,6,7],'Follow psoas major inferiorly toward the thigh. Its fascial compartment provides a route for a collection to track below the inguinal ligament. Distinguish a deep posterior collection from a superficial abdominal-wall lesion.'),
  c('aorta','Three diaphragmatic openings',1,[8,10,11],'Track the IVC at T8, esophagus at T10 and aorta at T12. In a cross-section, the aorta passes behind the diaphragm rather than through its muscular part.'),
  c('aorta','Sort branches by what they supply',1,[10,12,13,14,17,18,19],'The three unpaired ventral trunks supply gut. The paired renal, middle suprarenal and gonadal arteries supply organs. Lumbar arteries supply the wall. Follow common iliac → external iliac → femoral at the inguinal ligament.'),
  c('aneurysm','Locate a dilation relative to the renal arteries',2,[15,16],'On an angiogram, find the common iliac arteries, trace upward to the bifurcation and find the renal origins. A dilation between those landmarks is infrarenal.'),
  c('ivc','Venous drainage is asymmetric',3,[21,22,23,24,25],'Start at the L5 union of the common iliac veins. Retrace the long left renal vein anterior to the aorta. The left gonadal and suprarenal veins enter it, whereas their right counterparts normally drain to the IVC.'),
 ],
 A2:[
  c('landmarks','Build the plexus inside psoas',0,[3,4,5],'Locate the anterior rami in psoas major. Use the surface or border from which each nerve emerges before trying to identify a small branch.'),
  c('landmarks','Upper lateral branches',0,[5,6,7],'Follow the iliohypogastric and ilioinguinal nerves toward the abdominal wall. Their sensory territories are different from the lateral femoral cutaneous nerve, which passes toward the lateral thigh.'),
  c('landmarks','Genitofemoral branches and the cremaster',0,[7,8,9],'Look on the anterior surface of psoas for the genitofemoral nerve. Its genital branch supplies cremaster motor fibers. Its femoral branch is sensory to a small patch just below the inguinal ligament.'),
  c('thigh','Femoral versus obturator',0,[8,9,10],'Femoral emerges laterally and supplies anterior thigh functions such as knee extension. Obturator emerges medially, passes through the obturator canal, and is associated with thigh adduction.'),
  c('lymph','Preaortic versus lateral aortic nodes',1,[11,12,13],'Trace lymph along arterial routes. Gut drains to preaortic nodes near the origins of its major unpaired arteries. The kidneys and gonads drain to lateral aortic (para-aortic) nodes.'),
  c('lymph','Use drainage to localize disease',1,[13,14,15],'A testicular lesion can spread first to para-aortic nodes because the gonad retains its abdominal drainage. Scrotal skin instead follows superficial drainage to inguinal nodes.'),
 ],
 A5:[
  c('map','Locate cortex from the corpuscles',0,[4,13,15,21],'The true medulla lacks corpuscles. A bundle of straight tubules beside corpuscles is a cortical medullary ray, so straight profiles alone cannot identify the medulla.'),
  c('map','Lobe, lobule and nephron populations',0,[3,7,13],'A lobe is a pyramid with associated cortex. A cortical lobule is centered on a medullary ray. Juxtamedullary nephrons have long loops that project more deeply into medulla.'),
  c('corpuscle','Find the two poles',1,[5,6,10,14],'Look for entering and exiting vessels at the vascular pole. At the urinary pole the simple squamous parietal lining continues into cuboidal proximal epithelium and filtrate enters the lumen.'),
  c('tubules','Proximal convoluted and straight are parts of one tubule',1,[5,9,16,17],'Pars convoluta means convoluted part and pars recta means straight part. Name the part and its parent segment to avoid calling every straight profile a thin limb.'),
  c('tubules','Compare nearby proximal and distal profiles',2,[15,16,17,20],'The proximal brush border often obscures its lumen. Distal profiles have a clearer lumen. Thin limbs are lined by flat cells, so use context and luminal erythrocytes to distinguish them from capillaries.'),
  c('ducts','Trace the outflow boundary',2,[18,19,21,22,23,24],'Follow collecting ducts through the medulla and papilla into a minor calyx. Look for conspicuous duct-cell borders, then identify the change to urothelium in the receiving calyx.'),
 ],
 P1:[
  c('organization','Excretory, homeostatic and endocrine jobs',0,[3,4],'Connect water and ion regulation to plasma composition, acid elimination to acid–base balance, and renal endocrine activity to erythropoietin, renin and active vitamin D.'),
  c('organization','Nephron architecture',0,[4,5,6,8],'A corpuscle filters, the proximal brush border supports bulk transport, and the long loops of juxtamedullary nephrons support the medullary gradient.'),
  c('organization','Two capillary beds in series',1,[8,11],'Follow afferent arteriole → glomerular tuft → efferent arteriole → peritubular vessels or vasa recta. The second capillary bed receives the blood that remains after filtration.'),
  c('flow','Afferent stretch and autoregulation',2,[12,13,14,15],'When arterial pressure rises within the autoregulatory range, stretch increases afferent resistance. That limits transmission of the pressure change to the glomerulus.'),
  c('signals','Distal salt delivery as feedback',2,[14,16,17,18],'Increased NaCl at the macula densa promotes local ATP and adenosine signaling and afferent constriction. This uses the composition of the tubular fluid as a signal.'),
  c('flow','Systemic stress and the renin response',2,[16,17,18,19,20,21],'Strong sympathetic activation can override local flow stabilization. Separate α₁ vascular constriction from β₁ stimulation of renin. Contrast efferent angiotensin II action with local vasodilators.'),
 ],
 P2:[
  c('balance','Compare transport rates',0,[2,3,4,5],'For a freely filtered solute, filtered load = GFR × plasma concentration. Excretion = filtration − reabsorption + secretion. Use matching mass/time units before comparing.'),
  c('balance','Fractional excretion',1,[5,14,15,17],'If 120 mg/min is filtered and 30 mg/min is excreted, fractional excretion is 25%. A fractional excretion greater than 100% can reflect net secretion.'),
  c('clearance','Translate excretion into a plasma volume',1,[6,7,8,9],'Multiply urine concentration by urine flow, then divide by plasma concentration. For U = 24 mg/mL, V = 2 mL/min and P = 4 mg/mL, C = 12 mL/min.'),
  c('clearance','Compare filtration markers',2,[9,10,11,12],'Inulin tracks GFR because tubular transport is negligible. Creatinine secretion can make its clearance slightly higher. Net urea reabsorption generally makes its clearance lower.'),
  c('extraction','Why PAH clearance is effective plasma flow',2,[13,14,16],'Filtered and secreted PAH is extensively extracted at low concentrations, although some remains in renal venous blood. Divide effective flow by fractional extraction to correct for incomplete removal.'),
  c('extraction','Convert plasma flow to blood flow',1,[16,18],'At hematocrit 0.40, plasma is 0.60 of blood volume. RPF 600 mL/min divided by 0.60 gives RBF 1,000 mL/min. GFR/RPF gives filtration fraction.'),
 ],
 P3:[
  c('barrier','Trace the barrier in order',0,[2,3,4,5],'Start in blood and cross fenestrated endothelium, the shared basement membrane and the podocyte slit diaphragm. The filtrate then enters Bowman space.'),
  c('barrier','Predict which contents cross',0,[5,6,7,8],'Small unbound solutes filter readily. Blood cells and most protein remain in the circulation. Think about size and the barrier properties rather than treating plasma and filtrate as identical.'),
  c('forces','Track the forces along the tuft',1,[9,10,11,12],'Capillary hydrostatic pressure favors filtration. Bowman-space pressure and plasma oncotic pressure oppose it. Bowman-space oncotic pressure is normally negligible. As water leaves the tuft, retained plasma proteins become more concentrated, increasing the oncotic opposition to filtration.'),
  c('forces','Calculate pressure and GFR separately',1,[12,13,16,17],'If pressures are 60, 15 and 30 mmHg for capillary, Bowman and opposing capillary oncotic pressure, the net pressure is 15 mmHg. Multiply by Kf to calculate a flow rate.'),
  c('forces','Obstruction versus loss of effective surface area',1,[13,16,17,23],'Obstruction raises pressure in Bowman space. Mesangial contraction reduces filtration area and Kf. Both lower GFR through different terms of the same relationship.'),
 ],
 P4:[
  c('tone','Compare afferent and efferent constriction',0,[14,15,16,18,19,20],'Constriction at the inlet lowers glomerular hydrostatic pressure. Moderate constriction at the outlet may raise tuft pressure even as plasma flow falls. Severe efferent constriction can lower GFR because very low flow increases the oncotic pressure of the retained plasma proteins.'),
  c('tone','Read filtration fraction as a ratio',0,[19,20,21],'Use GFR/RPF. If GFR remains 120 mL/min while RPF falls from 600 to 480 mL/min, the filtration fraction rises from 20% to 25%.'),
  c('tone','Downstream uptake after filtration',1,[21,22,24],'A higher filtration fraction leaves protein-rich efferent blood. Low hydrostatic and high oncotic pressure in peritubular capillaries favor uptake from interstitium.'),
  c('feedback','Compare high and low salt delivery at the macula densa',2,[24,25,26,27,28],'High NaCl delivery promotes ATP and adenosine signaling, constricts the afferent arteriole and reduces renin. Low delivery favors afferent dilation and renin release. It can result from increased proximal reabsorption or a low filtered load.'),
 ],
};

renalConcepts.A3=[
 c('orientation','Right versus left kidney',0,[4,5,6],'The liver generally holds the right kidney lower than the left. Identify the medial hilum and compare exposure to ribs before using the relationships to orient a specimen.'),
 c('orientation','Map anterior and posterior relations',0,[7,9,10],'Compare posterior relationships with diaphragm and posterior wall muscles to the different anterior visceral neighbors on the two sides. Use side-specific anatomy to interpret an image or access route.'),
 c('coverings','Follow the spaces outside the capsule',1,[14,15,16,17],'From inside out, distinguish fibrous capsule, perirenal fat, renal fascia and pararenal fat. Follow a collection along the fascial spaces instead of assuming it stays within the fibrous capsule.'),
 c('circulation','Identify the hilar order',1,[11,24,26],'At the hilum the usual anterior-to-posterior order is vein, artery and pelvis. Segmental arteries supply relatively discrete territories, relevant when planning a partial resection.'),
 c('outflow','Follow outflow from a papilla',1,[21,22],'Urine goes from papilla to minor calyx, major calyx, renal pelvis and ureter. A branched calculus can model the collecting-system outline.'),
 c('outflow','Localize abscess, calculus and a mobile kidney',2,[18,28,29],'Distinguish a collection around the kidney, a calculus in the collecting system, and position-dependent descent of the kidney. These describe different compartments or changes, even if each gives flank symptoms.'),
];
