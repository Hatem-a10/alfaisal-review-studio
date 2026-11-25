const concept=(title,objective,pages,text,figure)=>({title,objective,pages,text,figure});
const check=(question,key,why,...distractors)=>[question,[key,...distractors.map(d=>d[0])],[why,...distractors.map(d=>d[1])]];
const lesson=(code,title,file,group,objectives,concepts,checks)=>{
 const unit=file.endsWith('.pptx')?'slide':'page';
 return {code,title,file,group,unit,source:file.replace(/\.[^.]+$/,''),overview:concepts[0].text,objectives,topics:[{
  key:'applied',title:'Concepts and practice',pages:[...new Set(concepts.flatMap(c=>c.pages))],body:[],remember:concepts.map(c=>c.title),concepts,checks
 }]};
};
const peritubular=['Peritubular capillaries','They receive blood from efferent vessels and exchange with tubular interstitium.'];
const podocyte=['Podocytes','These form the visceral epithelial layer covering glomerular capillaries.'];
const macula=['Macula densa','This specialized tubular epithelium senses salt delivery.'];
const principal=['Principal cells','These mediate distal sodium and potassium handling and respond to ADH.'];
const alpha=['Type A intercalated cells','These secrete H⁺ and return bicarbonate toward blood.'];
const beta=['Type B intercalated cells','These secrete bicarbonate through apical pendrin.'];
const irrelevantForP5=['Apical NKCC2','NKCC2 is the salt transporter in the thick ascending limb.'];
const ncc=['Apical NCC','NCC reabsorbs NaCl in the early distal convoluted tubule.'];
const enac=['Apical ENaC','This channel admits sodium in the late distal nephron.'];

export const renalReleasedLessons=[
 lesson('A6','Histology of the nephron','kidney-histology-2.pptx','Histology',[
  'Identify kidney organization and distinguish the cortex, medulla and components of the uriniferous tubule.',
  'Trace blood flow and microscopic urine flow, relating epithelium to transport.',
  'Identify the renal corpuscle and the three layers of the filtration barrier.',
  'Describe the location, structure and function of the juxtaglomerular apparatus.',
  'Relate renal cells to hormone production and response.'
 ],[
  concept('Locate cortex, medulla and their vascular landmarks',0,[2,3,4,6,8,20,21],'Arcuate vessels mark the corticomedullary junction. Cortical radiate arteries run outward into cortex. A corpuscle identifies cortex. In medulla, compare vasa recta, thin limbs and collecting ducts by lining and luminal contents.'),
  concept('Follow blood through cortical and juxtamedullary nephrons',1,[3,5,7,10,11],'Afferent arterioles enter a tuft and efferent arterioles leave. Superficial efferent vessels form an exchange bed around cortical tubules. Juxtamedullary efferent vessels connect to vasa recta that accompany long loops. The vessel lining is endothelium, a simple squamous epithelium.'),
  concept('Separate plasma, filtrate and outflow',1,[12,20,21,22,23,25,26,27],'Filter fluid into Bowman space, then follow the proximal tubule, loop, distal tubule and collecting ducts to the papilla. Thin segments are flat; papillary ducts have taller epithelium and empty into a urothelium-lined minor calyx.'),
  concept('Recognize the corpuscle and filtration barrier',2,[7,10,13,14],'Read the barrier from blood to Bowman space: fenestrated endothelial layer, shared glomerular basement membrane and the slit diaphragm between podocyte foot processes. Parietal squamous cells form the outer capsule. Mesangial cells support the tuft but are distinct from these three barrier elements.','nephron-10'),
  concept('Draw the juxtaglomerular triangle',3,[15,16,17,18,19],'At the vascular pole the macula densa lies close to the afferent and efferent arterioles. Locate its tightly packed nuclei in the tubule, renin-producing granular cells in the arteriolar wall, and extraglomerular mesangial cells between them. Low salt delivery can promote renin release.'),
  concept('Identify hormone source versus target',4,[18,22,28],'Renin originates from granular cells. Renal interstitial cells produce erythropoietin, and proximal tubules activate vitamin D. ADH acts on collecting-duct principal cells and comes from outside the kidney.')
 ],[
  check('What is the epithelial lining of the blood vessel in a renal histology field?','Endothelium, a simple squamous epithelium','This thin epithelial layer lines the lumen of a blood vessel.', ['Urothelium','This lines the collecting outflow tract beyond the papilla.'],['Simple cuboidal with brush border','That pattern fits proximal tubular epithelium.'],['Podocyte epithelium','This is the visceral surface outside the capillary wall.']),
  check('Which landmark identifies the corticomedullary junction?','Arcuate vessels','They run along the base of the pyramids.', ['Papillary ducts opening into the calyx','Those mark the papillary tip.'],['Corpuscles in a cortical labyrinth','They identify cortex but not specifically its boundary.'],['Vasa recta in a pyramid','These are medullary vessels.']),
  check('Which epithelial cells form the filtration slits?','Podocytes','Their foot processes are separated by slit diaphragms.',macula,principal,alpha),
  check('Which structures are encountered by blood immediately after the glomerular tuft?','Efferent arteriole then peritubular vessels or vasa recta','Blood leaves the tuft through the efferent arteriole and enters a second capillary network.', ['Proximal tubule then thin limb','That is the route of filtrate.'],['Cortical radiate then afferent arteriole','Those vessels are upstream of the tuft.'],['Minor then major calyx','Those structures carry urine.']),
  check('Which structure monitors tubular salt at the vascular pole?','Macula densa','It communicates changes in luminal salt delivery to the juxtaglomerular apparatus.',podocyte,principal,peritubular),
  check('Which kidney cell directly releases renin?','Juxtaglomerular granular cell','It is a modified arteriolar smooth muscle cell within the JGA.',macula,podocyte,principal)
 ]),
 lesson('P5','Tubular functions I','tubular-functions.pdf','Physiology',[
  'Interpret the tubular fluid-to-plasma concentration ratio.',
  'Explain the main routes and mechanisms of proximal reabsorption and secretion.',
  'Distinguish transport maximum, renal threshold and splay using glucose.',
  'Locate key proximal transporters relative to the lumen and interstitium.'
 ],[
  concept('Interpret TF/P as concentration rather than amount',0,[5,6],'TF/P divides tubular concentration by plasma concentration. A freely filtered nonreabsorbed solute becomes more concentrated as water leaves. TF/P near one can coexist with extensive isotonic reabsorption.'),
  concept('Separate routes through and between cells',1,[6,7],'Transcellular transport crosses apical and basolateral membranes. Paracellular transport uses intercellular junctions. Osmosis moves water and solvent drag carries solute with that water. Endocytosis retrieves filtered small proteins.'),
  concept('Follow energy from the basolateral ATPase',3,[8,9,20,21],'The basolateral Na⁺/K⁺ pump maintains low intracellular Na⁺. Apical SGLT and sodium–phosphate cotransport use the Na⁺ gradient. Na⁺/H⁺ exchange supports filtered bicarbonate reclamation, with basolateral bicarbonate exit.'),
  concept('Early and late proximal transport differ',1,[19,20,21,22,23],'Early proximal fluid preferentially loses glucose, amino acids and bicarbonate. A relative enrichment of chloride supports later NaCl recovery. Water removal also raises luminal urea concentration, favoring passive reabsorption.'),
  concept('Read filtered, reabsorbed and excreted glucose curves',2,[10,11,12,14,15,17,18],'Filtered glucose rises linearly with plasma glucose at fixed GFR. Reabsorbed load approaches a plateau (Tm). Urinary glucose starts near the renal threshold before the aggregate Tm is reached, producing splay.', 'tubular-17'),
  concept('Work the glucose overload case',2,[3,4,34,35],'Convert 320 mg/dL to 3.2 mg/mL. At GFR 125 mL/min, filtered glucose is 400 mg/min. Subtract actual reabsorption to estimate excretion. Unreclaimed glucose retains water in the tubule and promotes osmotic diuresis.')
 ],[
  check('TF/P of sodium stays near 1 while fluid volume falls. What happened?','Water and sodium were removed in roughly proportional amounts','The ratio is about concentration, which can stay stable despite reduced amount.', ['No sodium was reabsorbed','The amount of sodium falls with volume at the same concentration.'],['Sodium was secreted exclusively','Exclusive secretion would raise tubular concentration if water also leaves.'],['Water followed no osmotic gradient','The ratio does not establish that.']),
  check('Which transport directly uses ATP to establish the proximal sodium gradient?','Basolateral Na⁺/K⁺ ATPase','The pump maintains low intracellular Na⁺ and drives secondary transport.',irrelevantForP5,ncc,enac),
  check('Why can glucose appear in urine before the whole-kidney Tm is reached?','Splay from gradual saturation across nephrons','Transport capacity varies and the change is not an abrupt single threshold.', ['Glucose stops filtering','Filtered load keeps rising with plasma glucose.'],['Inulin competes for SGLT','Inulin is not reclaimed by SGLT.'],['All nephrons stop reabsorbing simultaneously','That would yield a much sharper transition.']),
  check('At glucose 320 mg/dL and GFR 125 mL/min, what is filtered glucose?','400 mg/min','320 mg/dL is 3.2 mg/mL, and 3.2 × 125 = 400.', ['40,000 mg/min','This omits the dL to mL conversion.'], ['400 mL/min','The result is a solute mass flow.'],['2.56 mg/min','Dividing concentration by GFR is not a filtered load.']),
  check('Which mechanism directly accounts for solute carried with water between proximal cells?','Paracellular solvent drag','Moving water convects dissolved solutes along the intercellular pathway.', ['Apical facilitated diffusion','This uses a transporter across the cell membrane.'],['Pinocytosis','This is vesicular uptake into cells.'],['Na⁺/K⁺ ATPase','This pumps cations across the basolateral membrane.'])
 ]),
 lesson('P6','Tubular functions II','tubular-functions.pdf','Physiology',[
  'Contrast early distal convoluted tubule with late distal nephron and collecting duct.',
  'Explain principal-cell sodium and potassium handling and its hormonal regulation.',
  'Explain type A and B intercalated-cell transport and factors that shift potassium secretion.'
 ],[
  concept('The early distal NaCl transporter',0,[24,33],'Apical NCC reabsorbs NaCl in the early DCT. Relatively low water permeability lets continued solute removal dilute luminal fluid. NCC is the thiazide target.'),
  concept('Principal-cell sodium entry and potassium exit',1,[25,26],'Apical ENaC admits sodium and basolateral Na⁺/K⁺ ATPase removes it into interstitium. Potassium loaded by that pump can exit into the lumen via apical channels. Sodium entry makes the lumen more negative.'),
  concept('Aldosterone and potassium-sparing drugs',1,[26,27,31,32],'Aldosterone favors distal sodium uptake and potassium secretion. Mineralocorticoid receptor antagonists reduce this signal. ENaC blockers instead act on the sodium channel, reducing the electrical drive for potassium secretion.'),
  concept('Type A intercalated cells secrete acid',2,[28,29],'Apical H⁺ ATPase secretes H⁺, and basolateral chloride–bicarbonate exchange returns bicarbonate to blood. Apical H⁺/K⁺ exchange can also reclaim potassium.'),
  concept('Type B intercalated cells secrete bicarbonate',2,[28,29],'Pendrin exchanges luminal chloride for bicarbonate at the apical surface. Compare that membrane location with the basolateral exchanger of type A cells.', 'tubular-28'),
  concept('Potassium secretion depends on what reaches the distal nephron',2,[30,31,32,33],'High potassium intake, aldosterone and increased distal sodium delivery or flow can promote potassium secretion. Acid–base status modulates this pattern. Distinguish the distal flow signal from the total sodium filtered.')
 ],[
  check('Which transporter is apical in the early distal convoluted tubule?','NCC','The early distal segment reabsorbs NaCl via NCC.',irrelevantForP5,enac,['SGLT2','This mediates early proximal glucose uptake.']),
  check('Why can ENaC blockade reduce potassium loss?','It reduces the lumen-negative drive supporting potassium secretion','Less sodium entry diminishes the voltage gradient for luminal potassium movement.', ['It directly accelerates ROMK','That would facilitate potassium secretion.'],['It blocks Bowman-space filtration selectively','The drug acts in the distal nephron.'],['It activates aldosterone receptors','That would strengthen sodium reabsorption and potassium secretion.']),
  check('Which cell secretes bicarbonate via apical pendrin?','Type B intercalated cell','The apical exchange secretes bicarbonate into the lumen.',alpha,principal,macula),
  check('What happens when type A intercalated cells increase apical H⁺ pumping?','More H⁺ enters tubular fluid','This supports acid excretion while bicarbonate is directed toward blood.', ['More bicarbonate is secreted via apical pendrin','That is type B transport.'],['Collecting ducts become water permeable by NCC','ADH controls water permeability through aquaporins.'],['Glucose reabsorption reaches Tm','That is a separate proximal process.']),
  check('At the same aldosterone level, which change favors potassium secretion?','More distal sodium delivery and flow','These support sodium entry and wash away luminal potassium.', ['Less distal flow','Slower flow tends to reduce the driving gradient.'],['Selective ENaC blockade','It reduces the electrical driving force.'],['Zero luminal sodium with intact ENaC','Lack of sodium limits electrogenic uptake.'])
 ]),
 lesson('P7','Urine concentration and dilution I','urine-concentration.pdf','Physiology',[
  'Compare water and solute permeability across the loop of Henle.',
  'Explain countercurrent multiplication and identify the diluting segments.',
  'Explain how loop diuretics act.'
 ],[
  concept('The descending limb loses water',0,[3,4],'Descending thin limb is water permeable. Water exits into progressively hypertonic medullary interstitium, concentrating luminal fluid as it descends.'),
  concept('The thin ascending limb loses salt',0,[5],'This segment has low water permeability. NaCl can leave passively where the concentration gradient favors exit.'),
  concept('Thick ascending limb separates salt from water',0,[6,7],'Apical NKCC2 moves Na⁺, K⁺ and Cl⁻ into cells. Salt is reabsorbed with little accompanying water, so luminal fluid becomes dilute. Potassium recycling contributes to lumen-positive voltage.'),
  concept('Build the corticomedullary gradient',1,[3,6,7,13],'Countercurrent flow repeats the separation of salt and water along the loop. Multiplied across medullary depth, this supports a high interstitial osmolality that can later drive water extraction.', 'urine-13'),
  concept('Differentiate generation from preservation',1,[7,10,11,13,14],'The loop generates the gradient, while countercurrent exchange in vasa recta limits washout. Urea contributes to inner medullary osmolality. The early DCT continues to dilute tubular fluid.'),
  concept('Blocking NKCC2 affects salt and water handling',2,[6,7,24],'A loop diuretic impairs thick ascending limb salt transport and reduces the medullary gradient. This weakens concentrating ability and increases downstream salt delivery.')
 ],[
  check('Which segment readily loses water into the medulla without active NKCC2 transport?','Thin descending limb','It is water permeable, so osmotic gradients pull water out.', ['Thick ascending limb','It transports salt and is relatively water impermeable.'],['Early DCT','It reabsorbs NaCl and further dilutes tubular fluid.'],['Thin ascending limb','It has low water permeability.']),
  check('Which process directly dilutes luminal fluid in thick ascending limb?','Salt removal without water following','NKCC2-mediated salt reabsorption occurs in a relatively impermeable segment.', ['Water removal without salt','That would concentrate fluid.'],['ADH inserting apical channels there','The regulated aquaporin response is in principal cells.'],['Equal removal of solute and water','That would preserve concentration.']),
  check('Which vessel arrangement limits medullary solute washout?','Countercurrent exchange in vasa recta','Slow hairpin exchange helps preserve the interstitial gradient.', ['Afferent arteriole constriction alone','This regulates filtration pressure.'],['Single pooled renal vein flow','It does not act as a local exchange system.'],['Cortical capillary filtration into Bowman space','This forms ultrafiltrate, not countercurrent exchange.']),
  check('What is the principal target of loop diuretics?','Apical NKCC2','These agents inhibit thick ascending limb Na⁺/K⁺/2Cl⁻ cotransport.',ncc,enac,['Aquaporin-2','It mediates ADH-regulated water entry in principal cells.']),
  check('Why does NKCC2 inhibition impair maximal urine concentration even when ADH is present?','The medullary osmotic driving force decreases','Water-permeable ducts still require a hyperosmotic interstitium to extract water.', ['Aldosterone instantly disappears','Loss of aldosterone is not the direct mechanism.'],['The nephron stops filtering entirely','Loop transporter inhibition need not abolish filtration.'],['Collecting ducts switch to secretion of glucose','Glucose handling is mainly proximal.'])
 ]),
 lesson('P8','Urine concentration and dilution II','urine-concentration.pdf','Physiology',[
  'Explain aldosterone effects on principal and intercalated cells and the link to alkalosis.',
  'Explain ADH action and distinguish central and nephrogenic diabetes insipidus.',
  'Calculate free water clearance and interpret its sign.'
 ],[
  concept('Aldosterone links sodium retention to acid secretion',0,[9,22],'In principal cells aldosterone favors sodium uptake and potassium secretion. Its distal effects also promote H⁺ secretion by type A intercalated cells. Excess mineralocorticoid action can contribute to hypokalemic metabolic alkalosis. See Tubular Functions II for the transporter details.'),
  concept('ADH assembles a transcellular water path',1,[9,11,12,14],'ADH acts at basolateral V₂ receptors, increases cAMP and promotes insertion of aquaporin-2 at the apical membrane of principal cells. Water exits via basolateral aquaporins and is driven by the medullary gradient.', 'urine-12'),
  concept('Compare high and low ADH states',1,[13,14,15,18,22],'With high ADH and an intact gradient, more water is reclaimed and urine concentrates. Low ADH leaves the collecting system less water permeable. In SIADH, water retention is inappropriate for the low plasma osmolality.'),
  concept('Compare central and nephrogenic DI',1,[15,16,17],'Central DI reflects deficient ADH secretion. Nephrogenic DI reflects reduced kidney response. Both can give dilute urine and polyuria. Desmopressin improves concentrating ability in central DI more than in complete nephrogenic DI.'),
  concept('Calculate osmolar and free water clearance',2,[19,20,21],'Osmolar clearance is Uosm × V ÷ Posm. Subtract it from urine flow to get free water clearance. For V = 4 mL/min, Uosm = 150 and Posm = 300 mOsm/kg, osmolar clearance is 2 mL/min and free water clearance is +2 mL/min.'),
  concept('Interpret the sign before interpreting the magnitude',2,[19,20,21],'Positive means urine is dilute relative to plasma, negative means urine is concentrated, and zero means urine osmolality equals plasma osmolality. Negative free water clearance is a calculated net quantity even though measured urine flow is positive.')
 ],[
  check('Where does ADH increase aquaporin-2 insertion?','Apical membrane of principal cells','Basolateral V₂ signaling increases apical water permeability.', ['Basolateral membrane of podocytes','Podocytes participate in glomerular filtration.'],['Lumen of the early DCT via NCC','NCC transports NaCl.'],['Apical membrane of type B intercalated cells','These use pendrin to secrete bicarbonate.']),
  check('Dilute urine concentrates after desmopressin in a patient with DI. Which pattern best fits?','Central DI','The ability to respond points to deficient endogenous hormone signaling.', ['Complete nephrogenic DI','Renal resistance limits the response.'],['Persistent SIADH','It usually produces inappropriately concentrated urine.'],['Primary aldosterone excess alone','This is not the classic selective restoration pattern.']),
  check('Uosm is 600, Posm 300 and urine flow 2 mL/min. What is free water clearance?','−2 mL/min','Osmolar clearance is 4 mL/min, so 2 − 4 = −2.', ['+2 mL/min','This reverses the sign for concentrated urine.'],['+4 mL/min','This is osmolar clearance.'],['0 mL/min','That would require equal urine and plasma osmolalities.']),
  check('Which pattern is consistent with SIADH?','Urine remains inappropriately concentrated relative to hypotonic plasma','Excess signaling prevents maximal water excretion despite low plasma osmolality.', ['Maximally dilute urine in all cases','Excess ADH increases tubular water permeability.'],['Loss of response to desmopressin is defining','That points toward renal resistance.'],['Urine flow must exactly equal osmolar clearance','That would indicate equal osmolalities.']),
  check('Which distal change links aldosterone excess with alkalosis?','Increased H⁺ secretion by type A intercalated cells','More net acid excretion favors higher plasma bicarbonate.', ['Increased bicarbonate secretion by type B cells only','This would tend to lower bicarbonate.'],['Blockade of collecting duct H⁺ ATPase','That would impair distal acid secretion.'],['ADH receptor resistance alone','It principally changes water concentration.'])
 ])
];
