import {paperLectures,repeatCategories} from './cvp-exam-category-map.mjs';
const titles=['Anatomy and Physiology of the Cardiopulmonary System','Embryological Development of the Cardiopulmonary System','Cardiac Conduction System and Electrophysiology','Cardiac Muscle Mechanics and Cardiac Valves','Cardiac Cycle','Cardiovascular Hemodynamics and Blood Flow','Regulation of Blood Pressure','Cardiovascular Investigation Methods','Anatomy and Histology of the Thorax and Respiratory System','Mechanics, Regulation, and Control of Breathing','Ventilation and Respiratory Dead Space','Gas Diffusion, Perfusion, and Transport','Mechanisms of Arterial Hypoxia'];
const averages=[69.86,75.57,75.03,86.14,67.48,63.73,61.66,88.82,71.86,69.40,68.54,69.92,48.19];
export const categories=titles.map((title,i)=>({id:'K.'+String(i+1).padStart(2,'0'),title,average:averages[i]}));
const code=n=>'K.'+String(n).padStart(2,'0');
const anatomy={1:2,2:9,3:1,4:1,5:1,6:1,7:1,8:9,9:2,10:1,11:9,12:9,13:9,14:2,15:9,16:9,17:9,18:2,19:9,20:2,21:9,22:2,23:2};
const physiology={1:3,2:4,3:8,4:3,5:8,6:5,7:5,8:6,9:6,10:4,11:6,12:7,13:6,14:4,16:10,17:11,18:10,19:10,20:10,21:10,22:11,23:12,24:12,25:12,26:13,27:13,28:10};
export function isCvp(q){return !!(q?.lectureIds?.some(id=>id.startsWith('CVP-'))||q?.lectureId?.startsWith('CVP-')||/^cvp|^original-cvp/i.test(q?.source||'')||/^cvp-final-|^original-cvp/i.test(q?.id||''))}
export function classify(q){
 if(!isCvp(q))return null;
 if(categories.some(c=>c.id===q.examCategory))return q.examCategory;
 if(repeatCategories[q.id])return repeatCategories[q.id];
 const t=(q.question||'').normalize('NFKC').toLowerCase();
 const id=q.lectureIds?.find(id=>id.startsWith('CVP-'))||q.lectureId||paperLectures[q.id]||'',a=/CVP-A(\d+)/.exec(id),p=/CVP-P(\d+)/.exec(id);
 // Assign one primary category, using the prompt rather than distractor keywords.
 if(/embry|fetal|foetal|foramen ovale|ductus (?:venosus|arteriosus)|cardinal vein|supracardinal|vitelline|umbilical vein|oligohydramnios|aortic arch(?:es)? (?:form|develop)|double (?:aortic arch|inferior vena|ivc)|septum transversum|pleuroperitoneal|coarctation/.test(t))return code(2);
 if(/(?:ecg|ekg|electrocardi|mean (?:electrical |qrs )?axis|a-vf|avf|avr|avl|qrs|st.segment|pr (?:segment|interval)|limb lead|lead [iv]|echocardi|angiogra|cardiac catheter)/.test(t)&&!/(?:channel|action potential|conductance|depolari[sz]|repolari[sz]|purkinje|plateau|pacemaker)/.test(t))return code(8);
 if(/purkinje|conduction pathway|moderator band|sinoatrial|pacemaker|action potential|funny current|plateau|ventricular depolari|sa node|sympathetic.*(?:heart rate|sa node)|preganglionic.*heart rate/.test(t))return code(3);
 if(/baroreceptor|vasomotor|nucleus ambiguus|medullary ischem|cushing.{0,12}reflex|renin|angiotensin|long.term.*blood pressure/.test(t))return code(7);
 if(/tidal volume|minute ventilation|dead.space|alveolar ventilation|inspired oxygen pressure|inspired po|inspired oxygen fraction|alveolar po|alveolar oxygen partial pressure|paco2|alveolar hypoventilation/.test(t)&&!/(?:a.a|a–a|a-a|alveolar.arterial|gradient|shunt|v.?q|perfusion mismatch)/.test(t))return code(11);
 if(/(?:a.a|a–a|a-a|alveolar.arterial).*gradient|right.to.left.*shunt|v.?q mismatch|ventilation.perfusion|pulmonary embol|venous admixture|hypoxi[ac].*mechanism|hypoxemia.*cause/.test(t))return code(13);
 if(/hemoglobin|haemoglobin|oxygen.binding|oxygen affinity|p50|dissociation curve|carbon monoxide|diffusion.limited|perfusion.limited|gas exchange|oxygen molecule|carbon dioxide.*transport/.test(t)&&!a)return code(12);
 if(/surfactant|compliance|airway resistance|pursed.lip|chemoreceptor|hering|breuer|stretch receptor|control of breathing/.test(t)&&!a)return code(10);
 if(a)return anatomy[Number(a[1])]?code(anatomy[Number(a[1])]):null;
 if(p)return physiology[Number(p[1])]?code(physiology[Number(p[1])]):null;
 // Older booklet questions have no lecture tag. Keep uncertain prompts unclassified.
 if(/phrenic|pleur|bronch|laryn|trachea|lung lobe|intercostal|thorac|pneumocyte|nasal|ethmoid|vocal fold/.test(t))return code(9);
 if(/cardiac cycle|heart sound|isovolum|ventricular ejection|pressure.volume loop/.test(t))return code(5);
 if(/troponin|contractility|myosin|cardiac muscle|valv.*(?:stenos|regurgit)|murmur/.test(t))return code(4);
 if(/cardiac output|venous return|blood flow|vascular resistance|poiseuille|starling force|capillary.*pressure/.test(t))return code(6);
 if(/blood pressure|hypertension/.test(t))return code(7);
 return null;
}
export function report(run,kind='mock',lookup=()=>null){
 const questions=kind==='original'?(run.ids||[]).map(lookup).filter(Boolean):run.questions||[];
 const rows=categories.map(c=>({...c,total:0,correct:0,wrong:0,unanswered:0,selfCheck:0,questionIndices:[]})),byId=new Map(rows.map(c=>[c.id,c]));
 const frozen=new Map((run.receipt?.questions||[]).map(q=>[q.id,q]));let cvp=0,unclassified=0,selfCheck=0;
 questions.forEach((q,i)=>{if(!isCvp(q))return;cvp++;const row=byId.get(classify(q)),r=frozen.get(q.id),key=r?r.key:q.answer,selected=r?r.selected:run.answers?.[kind==='original'?q.id:i];
  const keyed=q.type!=='short'&&Number.isInteger(key)&&key>=0&&key<(r?r.options:q.options)?.length;
  if(!keyed){selfCheck++;if(row)row.selfCheck++;return}if(!row){unclassified++;return}
  row.total++;row.questionIndices.push(i);if(!Number.isInteger(selected))row.unanswered++;else if(selected===key)row.correct++;else row.wrong++;
 });
 rows.forEach(row=>{row.percent=row.total?row.correct/row.total*100:null;row.difference=row.percent===null?null:row.percent-row.average});
 const total=rows.reduce((n,r)=>n+r.total,0),correct=rows.reduce((n,r)=>n+r.correct,0);
 return {rows,cvp,total,correct,percent:total?correct/total*100:null,unclassified,selfCheck};
}
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=n=>n===null?'—':n.toFixed(2)+'%';
export function markup(data){if(!data.cvp)return '';return `<div class="analysis-heading"><div><span class="eyebrow muted">CVP 112 · CATEGORY PERFORMANCE</span><h2>Analysis</h2><p>Your exam, broken down by learning category.</p></div><div class="analysis-total"><strong>${pct(data.percent)}</strong><span>${data.correct} / ${data.total} classified scored questions</span></div></div><div class="analysis-key"><span><i></i>Your result</span><span><b></b>Supplied average</span></div><div class="analysis-table" role="table" aria-label="CVP category analysis"><div class="analysis-labels" role="row"><span role="columnheader">Assessment category</span><span role="columnheader">Your score</span><span role="columnheader">Reference avg.</span><span role="columnheader">Difference</span></div>${data.rows.map(r=>`<div class="analysis-row ${r.total?'':'analysis-not-tested'}" role="row"><div role="cell"><span class="analysis-code">${r.id}</span><h3>${escape(r.title)}</h3>${r.total?`<div class="analysis-bar" aria-hidden="true"><span style="width:${r.percent}%"></span><i style="left:${r.average}%"></i></div><small>${r.wrong} wrong · ${r.unanswered} unanswered${r.selfCheck?' · '+r.selfCheck+' self-check':''}</small>`:`<small>Not tested${r.selfCheck?' · '+r.selfCheck+' ungraded item'+(r.selfCheck===1?'':'s'):''}</small>`}</div><div class="analysis-your" role="cell"><strong>${pct(r.percent)}</strong><small>${r.total?r.correct+' / '+r.total:'Not tested'}</small></div><div role="cell" class="analysis-average">${pct(r.average)}</div><div role="cell" class="analysis-difference ${r.difference===null?'':r.difference>=0?'positive':'negative'}">${r.difference===null?'—':(r.difference>=0?'+':'')+r.difference.toFixed(2)+' pp'}</div></div>`).join('')}</div><p class="analysis-footnote">Reference averages supplied by you, shown in K.01–K.13 order. Your practice question mix may differ from the reference assessment; differences are descriptive, not a percentile or a prediction. Categories are editorial study mappings, not official question tags. Unanswered scored questions count as incorrect; written and uncertain-key items are excluded.${data.selfCheck?' '+data.selfCheck+' CVP items need self-checking.':''}${data.unclassified?' '+data.unclassified+' scored CVP questions could not be classified reliably and are excluded from category totals.':''}</p>`}
export function mount(run,kind,lookup){const target=document.getElementById('examCategoryAnalysis');if(!target||!run.finishedAt||target.dataset.at!==String(run.finishedAt))return;if(!document.getElementById('examAnalysisStyles')){const link=document.createElement('link');link.id='examAnalysisStyles';link.rel='stylesheet';link.href='/exam-analysis.css?v=144';document.head.append(link)}const data=report(run,kind,lookup);target.innerHTML=markup(data);target.hidden=!data.cvp;target.setAttribute('aria-busy','false')}
