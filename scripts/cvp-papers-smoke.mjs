// Isolated local-browser QA. Never connects to a user's existing browser/profile.
import {spawn} from 'node:child_process';import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:5173/';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Visual smoke runs only against a local preview.');
const binary=process.env.REVIEW_STUDIO_BROWSER||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',profile=await mkdtemp(path.join(tmpdir(),'review-studio-visual-')),out=path.resolve('.sites-runtime/cvp-papers-smoke');await mkdir(out,{recursive:true});
let browser,ws;const pending=new Map(),checks=[],errors=[];let seq=0;
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout: '+method))},12000);pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))})}
try{
 browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Isolated browser did not start')),12000);browser.once('error',reject);browser.stderr.on('data',chunk=>{text=(text+chunk).slice(-12000);const m=text.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1])}})});
 ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''))};
 const target=await send('Target.createTarget',{url:'about:blank'}),attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),sid=attached.sessionId;const call=(m,p)=>send(m,p,sid),evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};await call('Page.enable');await call('Runtime.enable');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});

 await call('Page.navigate',{url:base+'#practice'});for(let i=0;i<100;i++){if(await evaluate("document.documentElement.dataset.boot==='ready'"))break;await new Promise(r=>setTimeout(r,100))}
 await evaluate("etPracticeTab='original';go('practice');true");for(let i=0;i<50;i++){if(await evaluate("ORIGINAL_EXAMS.sets.some(s=>s.id==='cvp-final-b14-mcq')"))break;await new Promise(r=>setTimeout(r,100))}
 await new Promise(r=>setTimeout(r,600));
 const add=async(name,expression)=>{const result=await evaluate(expression);checks.push({name,passed:!!result});if(!result){console.log(JSON.stringify({errors,content:await evaluate("document.querySelector('#content').textContent.slice(0,1200)"),module:await evaluate("import('/cvp-past-papers.mjs').then(m=>m.papers.sets.length).catch(e=>e.message)"),original:await evaluate("typeof originalCatalog")}));throw Error(name)}};
 await add('all five batches have original final sets',"[14,15,16,17,18].every(b=>ORIGINAL_EXAMS.sets.some(s=>s.id==='cvp-final-b'+b+'-mcq'))");
 await evaluate("(()=>{const batch=document.getElementById('originalBatchFilter');batch.value='18';batch.dispatchEvent(new Event('change'));return true})()");await new Promise(r=>setTimeout(r,600));
 await add('18th cards render and launch',"!!document.querySelector('[data-original-start=\"cvp-final-b18-mcq\"]')");
 await evaluate("document.querySelector('[data-original-start=\"cvp-final-b18-mcq\"]').click();true");
 await add('82 original questions and an untimed Examplify launch',"document.querySelectorAll('.original-question').length===82&&document.querySelector('#xpOriginalMinutes').value==='0'");
 await evaluate("document.querySelector('[data-xp-action=\"enter-original\"]').click();true");
 await add('Examplify shows one original question',"!!document.querySelector('#xpExam')&&document.querySelectorAll('.xp-question').length===1");
 await evaluate("document.querySelector('[data-xp-answer=\"4\"]').click();true");
 await add('original selected canonical answer saved',"originalRun.answers['cvp-final-b18-mcq-1']===4");
 await call('Page.reload');await new Promise(r=>setTimeout(r,2000));await evaluate("etPracticeTab='original';go('practice');true");await new Promise(r=>setTimeout(r,1500));
 await add('original answer restored after refresh without expiring',"originalRun?.answers['cvp-final-b18-mcq-1']===4&&!originalRun.finishedAt");
 await evaluate("originalRun=null;etPracticeTab='mock';etExam=null;etAccurate=false;go('practice');true");
 await evaluate("document.querySelector('#etAccurate').click();true");
 await add('Accurate sets CVP and a safe minimum',"etMockScope==='CVP'&&document.querySelector('#etMockCount').min==='76'");
 await evaluate("document.querySelector('#xpModePreference').click();document.querySelector('#etStartMock').click();true");for(let i=0;i<60;i++){if(await evaluate("!!etExam"))break;await new Promise(r=>setTimeout(r,100))}
 await add('Accurate produces 100 with all six green repeats',"etExam?.questions.length===100&&etExam.accurate.mandatoryIds.length===6&&etExam.accurate.mandatoryIds.every(id=>etExam.questions.some(q=>q.id===id))");
 await add('Accurate supports the existing Examplify presentation',"!!document.querySelector('#xpExam')&&document.querySelectorAll('.xp-question').length===1");
 await evaluate("document.querySelector('[data-xp-answer=\"'+etExam.questions[0].answer+'\"]').click();true");
 await add('Accurate Examplify answer uses the shuffled canonical key',"etExam.answers[0]===etExam.questions[0].answer");
 for(const [name,width,height]of [['desktop',1440,1000],['phone',390,844]]){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='phone'});await evaluate("etExam=null;etSaveExam();etPracticeTab='mock';render();true");await new Promise(r=>setTimeout(r,150));await add(name+' no horizontal overflow',"document.documentElement.scrollWidth<=innerWidth+1");const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(out,name+'.png'),Buffer.from(png.data,'base64'))}
 const report={checks,errors:[...new Set(errors)]};await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
}finally{ws?.close();browser?.kill('SIGTERM');await new Promise(r=>setTimeout(r,300));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
