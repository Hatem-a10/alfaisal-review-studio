import {formulas,problems,number} from './formulas-data.mjs';
import {renalFormulas} from './renal-formulas.mjs';
const all=[...formulas,...renalFormulas];
import {escapeHTML as esc} from './html-escape.mjs';
const read=()=>storeOptions().lessonFormulaDrills||{rounds:{},answers:{}};
const write=data=>saveOptions({...storeOptions(),lessonFormulaDrills:data});
export const lessonFormulas=(lecture,topic)=>all.filter(f=>f.lecture===lecture&&(!f.topic||!topic||f.topic===topic));
export function lessonFormulaMarkup(lecture,topic){
 const rows=lessonFormulas(lecture,topic);if(!rows.length)return '';
 const data=read(),round=data.rounds?.[lecture]||0;
 return '<section class="panel formula-library" data-lesson-formula-panel="'+esc(lecture)+'"><h2>Numerical formula drills</h2><p class="section-sub">Synthetic practice values, not patient measurements. Enter the stated units; these drills do not change review completion.</p><button type="button" data-lesson-formula-new>New practice numbers for this lecture</button>'+rows.map(f=>'<details class="formula-card" '+(data.open===f.id?'open':'')+'><summary><strong>'+esc(f.title)+'</strong> · '+esc(f.equation)+'</summary><div class="formula-body">'+(f.note?'<p>'+esc(f.note)+'</p>':'')+problems(f,round).map(p=>{
  const old=data.answers?.[p.id],correct=old&&Math.abs(Number(old.value)-p.answer)<=Math.max(.02,Math.abs(p.answer)*.005);
  return '<article class="formula-problem"><h3>Find '+esc(p.target)+'</h3><p>'+p.givens.map(([k,v])=>esc(k)+' = '+number(v)+' '+esc(f.vars[k].split(' · ')[1])).join(' · ')+'</p><label>Your answer · '+esc(f.vars[p.target].split(' · ')[1])+'<input inputmode="decimal" data-lesson-formula-answer="'+esc(p.id)+'" value="'+esc(old?.value||'')+'"></label><button type="button" data-lesson-formula-check="'+esc(p.id)+'" data-formula="'+esc(f.id)+'">Check answer</button>'+(old?.checked?'<div role="status" class="formula-feedback '+(correct?'correct':'incorrect')+'"><b>'+(correct?'Correct':'Review the working')+' · '+number(p.answer)+'</b><ol>'+[p.equation,...p.steps].map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol></div>':'')+'</article>';
 }).join('')+(f.source?'<p>Reviewed lecture source: <a href="/api/site-assets/materials/ren123/'+esc(f.source)+'#page='+f.page+'" target="_blank" rel="noopener noreferrer">p'+f.page+' ↗</a></p>':'<p>Curriculum: '+esc(f.lecture)+(f.page?' · Formula sheet p'+f.page:'')+'</p>')+'</div></details>').join('')+'</section>';
}
let installed=false;
export function installLessonFormulaDrills(){
 if(installed)return;installed=true;
 document.addEventListener('click',e=>{
  const b=e.target.closest('button'),panel=b?.closest('[data-lesson-formula-panel]');if(!panel)return;
  const lecture=panel.dataset.lessonFormulaPanel;if(lecture!==lessonId)return;
  const data=read(),round=data.rounds?.[lecture]||0;
  if(b.hasAttribute('data-lesson-formula-new')){
   const rounds={...data.rounds,[lecture]:round+1},answers={...data.answers};
   for(const f of lessonFormulas(lecture))for(const p of problems(f,round))delete answers[p.id];
   write({...data,rounds,answers});render();return;
  }
  if(b.dataset.lessonFormulaCheck){
   const f=lessonFormulas(lecture).find(row=>row.id===b.dataset.formula),p=f&&problems(f,round).find(row=>row.id===b.dataset.lessonFormulaCheck);
   const input=[...panel.querySelectorAll('[data-lesson-formula-answer]')].find(el=>el.dataset.lessonFormulaAnswer===p?.id),value=input?.value.trim();
   if(!p||!value||!Number.isFinite(Number(value))){toast('Enter a numeric answer in the stated units.');return}
   write({...data,open:f.id,answers:{...data.answers,[p.id]:{value:value.slice(0,40),checked:true}}});const y=scrollY;render();requestAnimationFrame(()=>scrollTo({top:y,behavior:'instant'}));
  }
 });
}
