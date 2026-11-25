import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {pbkdf2Sync,randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.REVIEW_BROWSER_MODULE||'playwright');
const temp=mkdtempSync(join(tmpdir(),'review-browser-')),config=resolve('dist/server/browser-fixture.json');
const base=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(base.vars?.REVIEW_STUDIO_DEPLOYMENT!=='staging')throw Error('Build staging first; never use a production candidate.');
const secret=randomBytes(32).toString('hex'),password=randomBytes(16).toString('hex'),salt=randomBytes(16);
const hash='pbkdf2-sha256$100000$'+salt.toString('hex')+'$'+pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
const accounts=['one','two'].map(n=>({id:'staging-'+n,email:n+'@example.test',name:'Synthetic '+n,passwordHash:hash}));
const cfg={...base,name:'review-studio-browser-fixture',workers_dev:false,preview_urls:false,routes:[],vars:{REVIEW_STUDIO_DEPLOYMENT:'staging',REVIEW_STUDIO_STAGING_SESSION_SECRET:secret,REVIEW_STUDIO_STAGING_ACCOUNTS:JSON.stringify(accounts)},d1_databases:[{binding:'DB',database_name:'browser-synthetic',database_id:randomUUID()}],r2_buckets:[{binding:'BUCKET',bucket_name:'browser-synthetic'}]};
delete cfg.account_id;delete cfg.observability;writeFileSync(config,JSON.stringify(cfg),{mode:0o600});
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js'),origin='https://localhost:8787',local=['--config',config,'--local','--persist-to',temp];
let server;
try{
 for(const file of ['drizzle/0000_huge_gladiator.sql','drizzle/0001_purple_norman_osborn.sql','staging/schema.sql','staging/managed-accounts.sql','staging/admin-control.sql','staging/admin-content.sql','staging/admin-academics.sql','staging/admin-resources.sql']){
  const result=spawnSync(process.execPath,[wrangler,'d1','execute','DB',...local,'--file',file],{stdio:'inherit',env:{...process.env,CLOUDFLARE_API_TOKEN:'',CLOUDFLARE_ACCOUNT_ID:''}});
  if(result.status!==0)throw Error('Local synthetic schema failed: '+file);
 }
 server=spawn(process.execPath,[wrangler,'dev',...local,'--ip','127.0.0.1','--port','8787','--local-protocol','https','--inspector-port','0'],{stdio:'inherit',env:{...process.env,CLOUDFLARE_API_TOKEN:'',CLOUDFLARE_ACCOUNT_ID:''}});
 for(const [label,engine,viewport] of [['desktop Chromium',chromium,{width:1440,height:1000}],['mobile WebKit',webkit,{width:390,height:844}]]){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport,ignoreHTTPSErrors:true,extraHTTPHeaders:{'CF-Connecting-IP':'192.0.2.42'}});
   // Browser only communicates with the isolated local origin.
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   let ready=false;
   for(let i=0;i<60;i++){try{const health=await context.request.get(origin+'/staging/health',{timeout:2000});if(health.ok()&&(await health.json()).authentication==='synthetic-signed-session'){ready=true;break}}catch{}await delay(1000)}
   assert.ok(ready,'Local staging Worker did not start.');
   const anonymous=await context.request.get(origin+'/api/progress',{headers:{'oai-authenticated-user-id':'forged'}});assert.equal(anonymous.status(),401);
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/');await page.waitForURL('**/staging/signin**');
   await page.getByLabel('Email').fill(accounts[0].email);await page.getByLabel('Password').fill(password);
   await page.getByRole('button',{name:/sign in/i}).click();
   await page.waitForURL(url=>url.origin===origin&&['/','/index.html'].includes(url.pathname),{timeout:30000,waitUntil:'domcontentloaded'});
   const session=await context.request.get(origin+'/staging/session');assert.equal((await session.json()).authenticated,true);
   await page.locator('html[data-boot="ready"]').waitFor({timeout:60000});await page.locator('#content').waitFor({state:'visible'});
   assert.ok((await page.locator('#content').innerText()).trim().length>0,'Dashboard is empty.');
   const welcome=page.locator('#studentProfileSetup');
   await welcome.waitFor({state:'visible',timeout:30000});
   await welcome.locator('[name=name]').fill('Synthetic Student');
   await welcome.locator('[data-next]').click();
   await welcome.locator('[name=group]').selectOption('M1');
   await welcome.locator('[name=section]').selectOption('A');
   const lab=welcome.locator('[name=lab]');
   await lab.locator('option:not([value=""])').first().waitFor({state:'attached'});
   await lab.selectOption({index:1});
   await welcome.locator('[data-next]').click();
   await welcome.locator('[data-next]').click();
   if(await welcome.isVisible())await welcome.locator('[data-next]').click();
   await welcome.waitFor({state:'hidden',timeout:30000});
   const nav=page.locator('button[data-view="calendar"]:visible').first();
   if(await nav.count()){await nav.click();await page.waitForFunction(()=>location.hash.includes('calendar')||document.querySelector('#content')?.querySelector('.campus-board'),null,{timeout:20000});}
   const width=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+8);assert.ok(width,'Unexpected page-level horizontal overflow.');
   const snapshot=await context.request.get(origin+'/api/progress');assert.equal(snapshot.status(),200);
   const other=await browser.newContext({viewport,ignoreHTTPSErrors:true});const second=await other.request.get(origin+'/api/progress');assert.equal(second.status(),401);await other.close();
   assert.deepEqual(errors,[],'Uncaught browser script errors');console.log('PASS',label,'synthetic login, dashboard, private API and responsive layout.');
   await context.close();
  }finally{await browser.close()}
 }
}finally{
 if(server){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),delay(5000)]);if(server.exitCode===null)server.kill('SIGKILL')}
 rmSync(config,{force:true});rmSync(temp,{recursive:true,force:true});
}
