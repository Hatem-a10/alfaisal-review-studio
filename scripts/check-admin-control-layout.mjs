import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const playwright = process.env.REVIEW_STUDIO_PLAYWRIGHT_MODULE;
const {chromium} = await import(playwright ? pathToFileURL(playwright).href : 'playwright');
let authorized=false;
const sections=['overview','students','roles','academics','resources','reports','announcements','analytics','storage','audit','site'];
const fixtures={
 access:{role:'owner',unlocked:true,sections},
 overview:{role:'owner',environment:'staging',summary:{registered:1,active7:1,onboarded:1},flags:{}},
 'students/list':{more:false,students:[{id:'synthetic',name:'Synthetic Student',email:'demo@example.test',studentGroup:'M2',studentSection:'A',labGroup:'2.1',onboarding:'complete',role:'student',suspended:false}]},
 'students/details':{activeMinutes:92,photo:null,sessions:[{createdAt:1763000000000,lastActiveAt:1763000001000,device:'Tablet',browser:'Safari'}],profile:{name:'Synthetic Student',studentGroup:'M2',studentSection:'A',labGroup:'2.1',englishFrequency:2,englishStartTime:'17:30'}},
 'roles/list':{more:false,students:[]},
 'academics/config':{active:null,draft:null,revisions:[]},
 'resources/list':{resources:[],total:0},
 'reports/list':{reports:[]},
 'announcements/list':{announcements:[]},
 analytics:{summary:{registered:1,active7:1,active30:1,onboarded:1,sharing:0},problems:[],registrations:[],activity:[]},
 'storage/summary':{backups:{state:'not_configured'}},
 audit:{entries:[],more:false},
 site:{flags:{readOnly:false,resourceLibrary:true,reports:true,sharedUploads:true,maintenance:''},environment:'staging',database:true,storage:true},
};
const server=createServer((req,res)=>{
 const {pathname}=new URL(req.url,'http://localhost');
 let data;
 if(pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{--text:#fefefe;--ink:#fefefe;--surface:#141414;--line:#444;--accent:#64e691;--muted:#bbb}html[data-theme=light]{--ink:#173021;--surface:#fafafa;--line:#aaa;--muted:#444}*{box-sizing:border-box}</style><main><button id="launch">Admin settings</button></main><script type="module">import {openAdminCenter} from "/admin-control-center.mjs";launch.onclick=openAdminCenter;</script>');return;}
 if(pathname==='/admin-control-center.mjs'||pathname==='/admin-control-center.css'){res.writeHead(200,{'content-type':pathname.endsWith('.css')?'text/css':'application/javascript'});res.end(readFileSync('public'+pathname));return;}
 if(pathname==='/api/academic-config')data={groups:[{studentGroup:'M2',studentSection:'A',labGroups:['2.1']}]};
 if(pathname==='/site-build-info.json')data={displayVersion:'v1.66',releases:[]};
 if(pathname.startsWith('/api/control-center/')){
  const section=pathname.split('/api/control-center/')[1];
  data=fixtures[section];
  if(section==='challenge'){authorized=true;data={expires:Date.now()+600000};}
  if(section==='students/profile'&&req.method==='POST'){
   fixtures['students/list'].students[0].name='Corrected Student';data={saved:true};
  }
  if(section==='students/suspend'){
   if(!authorized){res.writeHead(428,{'content-type':'application/json'});res.end('{"error":"Challenge needed"}');return;}
   fixtures['students/list'].students[0].suspended=true;data={saved:true};
  }
 }
 res.writeHead(data?200:404,{'content-type':'application/json'});res.end(JSON.stringify(data||{error:'Missing fixture'}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.REVIEW_STUDIO_BROWSER,headless:true});
try{
 for(const [width,height,theme] of [[390,844,'amoled'],[390,844,'light'],[834,1112,'light'],[1112,834,'amoled'],[1366,900,'amoled']]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  await page.getByRole('button',{name:'Admin settings',exact:true}).click();
  await page.getByRole('dialog',{name:'Admin Control Center'}).waitFor();
  await page.locator('nav').getByRole('button',{name:'Students',exact:true}).click();
  await page.getByText('Synthetic Student').waitFor();
  const box=await page.locator('.acc-center').boundingBox();
  assert.ok(box.width<=width&&box.height<=height);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'View account',exact:true}).click();
  const details=page.getByRole('dialog',{name:'Student details'});
  await details.getByText('1 h 32 min').waitFor();
  await details.getByText('Safari',{exact:true}).waitFor();
  await details.getByRole('button',{name:'Edit information'}).click();
  const edit=page.getByRole('dialog',{name:'Edit student information'});
  await edit.getByLabel('Lab group').selectOption('2.1');
  await edit.getByRole('button',{name:'Cancel'}).click();
  await details.getByRole('button',{name:'Close'}).click();
  if(width===390&&theme==='amoled'){
   await page.getByText('Actions',{exact:true}).click();
   await page.getByRole('button',{name:'Suspend',exact:true}).click();
   await page.getByRole('dialog',{name:'Suspend this student?'}).getByRole('button',{name:'Confirm'}).click();
   await page.getByLabel('Admin phrase').fill('synthetic-test-value');
   await page.getByRole('button',{name:'Verify',exact:true}).click();
   await page.getByText('Suspended',{exact:true}).last().waitFor();
   await page.getByRole('button',{name:'View account',exact:true}).click();
   await page.getByRole('button',{name:'Edit information'}).click();
   await page.getByLabel('Display name').fill('Corrected Student');
   await page.getByRole('button',{name:'Save profile'}).click();
   await page.getByText('Corrected Student',{exact:true}).waitFor();
   fixtures['students/list'].students[0].name='Synthetic Student';
  }
  for(const name of ['Roles & Permissions','Academic Management','Resource Library','Question Bank & Reports','Announcements','Analytics','Storage & Backups','Security & Audit Logs','Site Controls']){
   await page.locator('nav').getByRole('button',{name,exact:true}).click();
   await page.getByRole('heading',{name,exact:true}).waitFor();
   await page.waitForFunction(()=>!document.querySelector('.acc-content>.acc-status')?.textContent);
  }
  assert.deepEqual(errors,[]);
  console.log('Admin views and layout passed at',width+'×'+height,theme);
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
