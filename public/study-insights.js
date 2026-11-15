'use strict';
/* Debrief timing tracks the question actually visible, not background time. */
(function(){
 let tracked=null,lastIndex=null,lastAt=0,lastSaved=0;
 function currentRun(){if(view!=='practice')return null;if(etPracticeTab==='mock'&&etExam&&!etExam.finishedAt)return etExam;if(etPracticeTab==='original'&&originalRun&&!originalRun.finishedAt)return originalRun;return null}
 function saveRun(run){if(run===etExam)etSaveExam();else if(run===originalRun)saveOriginalRun()}
 function stop(now=Date.now()){
  if(!tracked||lastIndex===null||!lastAt)return;
  const deadline=Number.isFinite(tracked.deadline)?tracked.deadline:tracked.xp?.deadline;
  const pause=Number.isFinite(tracked.pausedAt)?tracked.pausedAt:tracked.xp?.pausedAt;const end=Math.min(now,Number.isFinite(deadline)?deadline:now,Number.isFinite(pause)?pause:now);
  const seconds=Math.max(0,Math.min(300,(end-lastAt)/1000));
  tracked.pacing??={seconds:{}};tracked.pacing.seconds[lastIndex]=(tracked.pacing.seconds[lastIndex]||0)+seconds;
  lastAt=end;
 }
 function visibleQuestion(run){
  const xp=document.querySelector('#xpExam');
  if(xp){if(xp.querySelector('.xp-cover,.xp-review,.xp-notice-dialog'))return null;const picker=xp.querySelector('#xpQuestionPick');if(!picker||!picker.getClientRects().length)return null;const i=Number(picker.value);return Number.isInteger(i)?i:null}
  const prefix=run===etExam?'mock':'original';const questions=[...document.querySelectorAll(`[id^="${prefix}-question-"]`)];
  if(!questions.length)return null;
  const middle=innerHeight*.42;let best=null;
  for(const el of questions){const rect=el.getBoundingClientRect();if(rect.bottom<=0||rect.top>=innerHeight)continue;const d=rect.top<=middle&&rect.bottom>=middle?0:Math.min(Math.abs(rect.top-middle),Math.abs(rect.bottom-middle));if(!best||d<best.d)best={i:Number(el.id.split('-').pop()),d}}
  return best&&Number.isInteger(best.i)?best.i:null;
 }
 function sample(){const active=currentRun(),paused=active&&(Number.isFinite(active.pausedAt)||Number.isFinite(active.xp?.pausedAt));const run=document.hidden||!document.hasFocus()||paused?null:active,index=run?visibleQuestion(run):null,now=Date.now();if(run!==tracked||index!==lastIndex){stop(now);if(tracked&&tracked!==run)saveRun(tracked);tracked=run;lastIndex=index;lastAt=index===null?0:now}else if(run&&index!==null&&now-lastSaved>=5000){stop(now);saveRun(run);lastSaved=now}}
 const finishMock=etFinishExam;etFinishExam=function(reason){sample();stop();lastIndex=null;lastAt=0;return finishMock(reason)};
 const finishOriginal=saveOriginalRun;saveOriginalRun=function(){if(originalRun?.finishedAt&&tracked===originalRun){stop(Date.parse(originalRun.finishedAt)||Date.now());lastIndex=null;lastAt=0}return finishOriginal()};
 document.addEventListener('visibilitychange',sample);window.addEventListener('pagehide',()=>{stop();if(tracked)saveRun(tracked);lastAt=0});window.addEventListener('scroll',sample,{passive:true});setInterval(sample,1000);
 function duration(n){const s=Math.max(0,Math.round(n));return s>=60?Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s':s+'s'}
 function pacingHTML(run,total,answers){
  const entries=Object.entries(run.pacing?.seconds||{}).map(([i,s])=>({i:Number(i),s:Number(s)})).filter(x=>Number.isInteger(x.i)&&x.i>=0&&x.i<total&&x.s>0).sort((a,b)=>b.s-a.s);
  if(!entries.length)return '<p class="muted">Question-by-question timing was not recorded for this attempt. New attempts record time while each question is visible.</p>';
  const last=Math.ceil(total/3),unanswered=answers.map((a,i)=>!a?i:null).filter(i=>i!==null),end=unanswered.filter(i=>i>=total-last).length;
  return `<p class="muted">Approximate visible time · background time and time outside the question view are excluded.</p><div class="debrief-metrics"><span><b>${entries.length}/${total}</b> questions timed</span><span><b>${unanswered.length}</b> unanswered</span><span><b>${end}</b> unanswered in final third</span></div><p><b>Most time:</b> ${entries.slice(0,5).map(x=>`Question ${x.i+1} · ${duration(x.s)}`).join(' &nbsp; · &nbsp; ')}</p>`;
 }
 function analysisSlot(run,kind){if(!run?.finishedAt)return '';const qs=kind==='mock'?run.questions:run.ids.map(originalQuestionById).filter(Boolean);if(!qs.some(q=>q.lectureIds?.some(id=>id.startsWith('CVP-'))||/^cvp|^original-cvp/i.test(q.source||q.id)))return '';queueMicrotask(()=>import('/exam-analysis.mjs').then(m=>m.mount(run,kind,originalQuestionById)).catch(()=>{const el=document.getElementById('examCategoryAnalysis');if(el)el.textContent='Category analysis could not load. Reopen these results to retry.'}));return `<section class="cvp-exam-analysis" id="examCategoryAnalysis" data-at="${esc(run.finishedAt)}" aria-busy="true"><p role="status">Preparing category analysis…</p></section>`}
 function debriefMock(run){const q=run.questions,wrong=q.map((x,i)=>Number.isInteger(run.answers[i])&&run.answers[i]!==x.answer?i:null).filter(i=>i!==null),unanswered=q.map((x,i)=>!Number.isInteger(run.answers[i])?i:null).filter(i=>i!==null),groups=new Map();
  q.forEach((x,i)=>{const topic=topicForQuestion(x),label=topic?topic.l.id+' · '+topic.topic.title:(x.lectureIds?.[0]||'Other questions');const item=groups.get(label)||{label,total:0,wrong:0,unanswered:0};item.total++;if(wrong.includes(i))item.wrong++;if(unanswered.includes(i))item.unanswered++;groups.set(label,item)});
  const weak=[...groups.values()].filter(x=>x.wrong||x.unanswered).sort((a,b)=>(b.wrong+b.unanswered)-(a.wrong+a.unanswered)).slice(0,6);
  const kinds=new Map();for(const i of wrong){const kind=q[i].kind||'Other';kinds.set(kind,(kinds.get(kind)||0)+1)}const types=[...kinds.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);const reasons={knowledge:'Knowledge gap',misread:'Misread question',reasoning:'Application / reasoning',time:'Time pressure',key:'Suspected question / key'};const tagged=new Map();for(const i of wrong){const tag=storeOptions().mistakes?.[q[i].id];if(reasons[tag])tagged.set(reasons[tag],(tagged.get(reasons[tag])||0)+1)};
  return `<section class="exam-debrief"><div class="section-head"><div><span class="eyebrow muted">AFTER YOUR MOCK</span><h3>Exam debrief</h3></div><span class="pill">${wrong.length} wrong · ${unanswered.length} unanswered</span></div><h4>Topics to revisit</h4>${weak.length?`<ul>${weak.map(x=>`<li><b>${esc(x.label)}</b> · ${x.wrong} wrong${x.unanswered?' · '+x.unanswered+' unanswered':''} / ${x.total}</li>`).join('')}</ul>`:'<p>No missed questions in this attempt.</p>'}${types.length?`<p><b>Missed question types:</b> ${types.map(([name,n])=>esc(name)+' · '+n).join(' &nbsp; · &nbsp; ')}</p>`:''}${tagged.size?`<p><b>Your previously tagged reasons:</b> ${[...tagged].map(([name,n])=>esc(name)+' · '+n).join(' &nbsp; · &nbsp; ')}</p>`:''}${wrong.length||unanswered.length?'<button type="button" id="debriefRetry" class="primary">Practice missed questions</button>':''}${run.xp?.activeMs?'':'<h4>Exam pacing</h4>'+pacingHTML(run,q.length,q.map((x,i)=>Number.isInteger(run.answers[i])))}</section>`;
 }
 const beforeDebriefSet=etConceptPanel;etConceptPanel=function(){return etSet?.debrief?'<section class="panel et-workspace"><span class="eyebrow muted">EXAM DEBRIEF</span><h2>Practice missed questions</h2><p class="muted">Questions you missed or left unanswered in your mock.</p>'+etSetMarkup()+'</section>':beforeDebriefSet()};
 const mockResults=etMockResults;etMockResults=function(){const html=mockResults();return html.replace('<div class="et-results-table">',analysisSlot(etExam,'mock')+debriefMock(etExam)+'<div class="et-results-table">')};
 const originalResults=originalWorkspace;originalWorkspace=function(){let html=originalResults();if(originalRun?.finishedAt){const qs=originalRun.ids.map(originalQuestionById).filter(Boolean),keyed=qs.filter(q=>q.type==='mcq'&&Number.isInteger(q.answer)),missed=keyed.filter(q=>Number.isInteger(originalRun.answers[q.id])&&originalRun.answers[q.id]!==q.answer).length,answers=qs.map(q=>Number.isInteger(originalRun.answers[q.id])||typeof originalRun.answers[q.id]==='string'&&!!originalRun.answers[q.id].trim());const block=`<section class="exam-debrief"><h3>Exam debrief</h3><p>${missed} incorrect keyed questions · ${qs.length-answers.filter(Boolean).length} unanswered · ${qs.length-keyed.length} require self-checking. Printed keys may contain mistakes.</p><h4>Exam pacing</h4>${pacingHTML(originalRun,qs.length,answers)}</section>`;html=html.replace('<div class="original-jumps">',analysisSlot(originalRun,'original')+block+'<div class="original-jumps">')}return html};
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='jumpFirstWrong'){const l=lessonById(lessonId),s=l&&inlineSession(l);if(!s)return;const i=s.questions.findIndex((q,n)=>(s.graded[n]&&s.answers[n]!==q.answer)||(s.retryIds||[]).includes(q.id));const el=document.getElementById('inline-question-'+i);if(el){const details=el.closest('details');if(details)details.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});el.setAttribute('tabindex','-1');el.focus({preventScroll:true})}}
  if(b.id==='debriefRetry'&&etExam?.finishedAt){const qs=etExam.questions.filter((q,i)=>!Number.isInteger(etExam.answers[i])||etExam.answers[i]!==q.answer);if(!qs.length)return;etSet={questions:qs.map(etShuffleQuestion),answers:{},finished:false,debrief:true};etPracticeTab='sets';render();document.querySelector('.et-set-summary')?.scrollIntoView({behavior:'smooth',block:'start'})}
 });
})();
