// Isolated local-browser QA. Never connects to a user's existing browser/profile.
import {spawn} from 'node:child_process';import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:5173/';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Visual smoke runs only against a local preview.');
const binary=process.env.REVIEW_STUDIO_BROWSER||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',profile=await mkdtemp(path.join(tmpdir(),'review-studio-visual-')),out=path.resolve('.sites-runtime/ospe-smoke');await mkdir(out,{recursive:true});
let browser,ws;const pending=new Map(),checks=[],errors=[];let seq=0;
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout: '+method))},12000);pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))})}
try{
 browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Isolated browser did not start')),12000);browser.once('error',reject);browser.stderr.on('data',chunk=>{text=(text+chunk).slice(-12000);const m=text.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1])}})});
 ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''))};
 const target=await send('Target.createTarget',{url:'about:blank'}),attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),sid=attached.sessionId;const call=(m,p)=>send(m,p,sid),evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};await call('Page.enable');await call('Runtime.enable');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 async function waitFor(expression){for(let i=0;i<100;i++){try{if(await evaluate(expression))return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Missing UI: '+expression)}
 for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='phone'});
  await call('Page.navigate',{url:base+'#ospe'});await waitFor("!!document.querySelector('[data-ospe-start]')");
  const check=async(label,expression)=>{const passed=await evaluate(expression);checks.push({name,label,passed});if(!passed)throw Error(label)};
  await check('no horizontal overflow',"document.documentElement.scrollWidth<=innerWidth+1");
  await check('hero does not overlap categories',"document.querySelector('.ospe-hero').getBoundingClientRect().bottom<=document.querySelector('.ospe-category-grid').getBoundingClientRect().top+1");
  await check('114 stations visible',"document.querySelectorAll('[data-ospe-open]').length===114");
  await evaluate("document.querySelector('[data-ospe-open=\"cvp-ospe-mock-1\"]').click();true");
  await evaluate("document.querySelector('[data-ospe-repeat]')?.click();true");
  await check('rubric initially hidden',"!document.querySelector('.ospe-rubric') && !!document.querySelector('.ospe-image')");
  await evaluate("document.querySelector('[data-ospe-answer]').value='Small muscular artery';document.querySelector('[data-ospe-answer]').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-ospe-reveal]').click();true");
  await check('answer survives reveal',"document.querySelector('[data-ospe-answer]').value==='Small muscular artery'&&!!document.querySelector('.ospe-rubric')");
  let png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(out,name+'-ospe-drill.png'),Buffer.from(png.data,'base64'));
  await evaluate("document.querySelector('[data-ospe-back]').click();document.querySelector('[data-ospe-start]').click();true");
  await check('timed station hides answers',"!!document.querySelector('#ospeClock')&&!document.querySelector('.ospe-rubric')");
  await evaluate("document.querySelector('[data-ospe-answer]').value='Saved response';document.querySelector('[data-ospe-answer]').dispatchEvent(new Event('input',{bubbles:true}));true");
  await evaluate('window.__ospeReloadMarker=true');await call('Page.reload');await waitFor("!window.__ospeReloadMarker && document.readyState==='complete' && document.documentElement.dataset.boot==='ready' && !!document.querySelector('[data-ospe-answer]')");
  await check('circuit and answer survive refresh',"document.querySelector('[data-ospe-answer]').value==='Saved response'");
  await evaluate("document.querySelector('[data-ospe-finish]').click();true");
  await check('finish opens self marking',"!!document.querySelector('.ospe-rubric')&&document.querySelector('[data-ospe-save]').disabled");
  await evaluate("window.confirm=()=>true;document.querySelector('[data-ospe-cancel]').click();document.querySelector('[data-ospe-start]').click();document.querySelector('[data-ospe-finish]').click();true");
  const markAll=async(value)=>{const count=await evaluate("document.querySelectorAll('[data-ospe-review]').length-2");for(let i=0;i<count;i++)await evaluate("document.querySelector('[data-ospe-review=\""+i+"\"]').click();for(let p=0;p<2;p++)document.querySelector('[data-ospe-mark][data-part=\"'+p+'\"][data-value=\""+value+"\"]').click();true")};
  await markAll(1);await check('fully marked review can save',"!document.querySelector('[data-ospe-save]').disabled");
  await evaluate("document.querySelector('[data-ospe-save]').click();window.__ospeSaved=storeOptions().practical.attempts.filter(a=>a.kind==='ospe').length;true");
  await check('valid OSPE score stored independently',"storeOptions().practical.attempts.some(a=>a.kind==='ospe'&&a.selfAssessed&&a.correct===a.total)");
  await evaluate("document.querySelector('[data-ospe-start]').click();document.querySelector('[data-ospe-finish]').click();true");await markAll(0);
  await evaluate("document.querySelector('[data-ospe-save]').click();true");await check('below15 percent not saved',"storeOptions().practical.attempts.filter(a=>a.kind==='ospe').length===window.__ospeSaved");
  await evaluate("go('labs');true");await waitFor("!!document.querySelector('.lab-category-group')");
  await check('labs grouped in walkthrough categories',"document.querySelectorAll('.lab-category-group').length===4");
  await check('category controls visible',"document.querySelectorAll('[data-lab-category]').length===5");
  await evaluate("document.querySelector('[data-lab-category=histology]').click();true");
  await check('category filtering preserves real modules',"document.querySelectorAll('.lab-category-group').length===1 && document.querySelector('.lab-category-group h3').textContent==='Histology'");
  await check('mobile/desktop labs fit',"document.documentElement.scrollWidth<=innerWidth+1");
  png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(out,name+'-labs.png'),Buffer.from(png.data,'base64'));
  await evaluate("go('ospe');true");await waitFor("!!document.querySelector('[data-ospe-start]')");
  await evaluate("if(document.documentElement.dataset.theme!=='amoled')document.querySelector('#themeToggle').click();true");
  await check('dark OSPE fits viewport',"document.documentElement.scrollWidth<=innerWidth+1");
  png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(out,name+'-ospe-menu.png'),Buffer.from(png.data,'base64'));
 }
 const report={checks,errors:[...new Set(errors)]};await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,failures:checks.filter(c=>!c.passed),errors:report.errors,output:out}));if(checks.some(c=>!c.passed)||errors.length)process.exitCode=1;
}finally{ws?.close();browser?.kill('SIGTERM');await new Promise(r=>setTimeout(r,300));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
