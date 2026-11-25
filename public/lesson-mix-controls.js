'use strict';
const lessonMix={mock:{enabled:false,ids:[]},sets:{enabled:false,ids:[]}};
function mixBank(){const bank=etBank().concat(typeof LEARNING==='undefined'?[]:LEARNING.questions||[],typeof TOPIC_CHECKS==='undefined'?[]:Object.values(TOPIC_CHECKS).flat());return [...new Map(bank.filter(q=>q&&!q.duplicateOf&&globalThis.reviewStudyItemVisible?.(q)!==false&&ExamEngine.usable(q)).map(q=>[q.id,q])).values()]}
function mixScope(mode){return mode==='mock'?etMockScope:etScope}
function mixEligible(mode){if(mode==='mock')return phase2MockPool(true);const course=mixScope(mode);return ExamEngine.pool(mixBank(),'all','all').filter(q=>q.lectureIds.every(id=>id.startsWith(course+'-')))}
function mixRows(mode,eligible=mixEligible(mode)){
 const course=mixScope(mode),counts=new Map();
 for(const question of eligible)for(const id of question.lectureIds)counts.set(id,(counts.get(id)||0)+1);
 const items=DATA.items.filter(x=>x.course===course&&globalThis.reviewStudyItemVisible?.(x)!==false);
 if(counts.has(course+'-Booklet'))items.push({id:course+'-Booklet',code:'Booklet',title:'Other booklet questions'});
 return items.filter(item=>counts.has(item.id)).map(item=>({item,count:counts.get(item.id)}));
}
function mockLessonSelection(eligible){
 if(!lessonMix.mock.enabled||etAccurate)return eligible;
 const ids=new Set(lessonMix.mock.ids);
 return eligible.filter(q=>q.lectureIds.some(id=>ids.has(id)));
}
function mixSelected(mode,rows=mixRows(mode)){const available=new Set(rows.map(row=>row.item.id));return [...new Set(lessonMix[mode].ids)].filter(id=>available.has(id))}
function mixPool(mode){const eligible=mixEligible(mode),ids=new Set(mixSelected(mode,mixRows(mode,eligible)));return eligible.filter(q=>q.lectureIds.some(id=>ids.has(id)))}
function etMockPool(){return phase2MockPool()}
function mixControls(mode,eligible=mixEligible(mode)){const m=lessonMix[mode],course=mixScope(mode),rows=mixRows(mode,eligible),selected=mixSelected(mode,rows),count=eligible.filter(q=>q.lectureIds.some(id=>selected.includes(id))).length,label=globalThis.reviewCourseConfig?.(course)?.label||({MOL:'MOL 114',REN:'REN 123',CVP:'CVP 112'}[course]||course);return `<details class="lesson-mix" data-mix-panel="${mode}" ${(m.expanded??m.enabled)?'open':''}><summary>Lesson selection</summary><label class="mix-enable"><input type="checkbox" data-mix-enabled="${mode}" ${m.enabled?'checked':''}> Choose individual lessons</label>${m.enabled?`<p class="section-sub">Choose lessons from the selected course.</p><div class="mix-actions"><button type="button" data-mix-all="${mode}" ${rows.length?'':'disabled'}>Select all available</button><button type="button" data-mix-clear="${mode}" ${selected.length?'':'disabled'}>Clear selection</button><span>${selected.length} lessons · ${count} questions</span></div><div class="mix-lessons"><fieldset><legend>${esc(label)}</legend>${rows.length?rows.map(({item:x,count:n})=>`<label><input type="checkbox" data-mix-lesson="${esc(x.id)}" data-mix-mode="${mode}" ${selected.includes(x.id)?'checked':''}><span>${esc(x.code)} · ${esc(title(x))}<small>${n} questions</small></span></label>`).join(''):'<p>No eligible mapped lessons for the current course and sources.</p>'}</fieldset></div>`:''}</details>`}

document.addEventListener('toggle',event=>{
 const panel=event.target,mode=panel.dataset?.mixPanel;
 if(mode&&panel.isConnected)lessonMix[mode].expanded=panel.open;
},true);
