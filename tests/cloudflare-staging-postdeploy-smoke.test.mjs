import test from 'node:test';import assert from 'node:assert/strict';import {checkStaging,privatePaths,stagingOrigin,runStagingSmoke,verifyStagingSecurityHeaders} from '../scripts/staging-postdeploy-smoke.mjs';
const expected={environment:'staging',sourceCommit:'a'.repeat(40),displayVersion:'1.85'};
function fixture(override={}){
 const calls=[];
 const fetcher=async(url,init)=>{const u=new URL(url);assert.equal(u.origin,stagingOrigin);assert.equal(init.redirect,'manual');assert.equal(init.method,'GET');calls.push(u.pathname);
 if(Object.hasOwn(override,u.pathname))return override[u.pathname]();
 if(u.pathname==='/staging/health')return Response.json({environment:'staging',authentication:'clerk',database:true,storage:true});
 if(u.pathname==='/site-build-info.json')return Response.json(expected);
 if(u.pathname==='/auth/session')return Response.json({authenticated:false});
 if(u.pathname==='/')return new Response(null,{status:303,headers:{location:stagingOrigin+'/auth/sign-in'}});
 if(u.pathname==='/auth/sign-in')return new Response('<html/>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'"}});
 if(u.pathname==='/api/capabilities')return Response.json({admin:false,adminSettingsUnlocked:false});
 assert.ok(privatePaths.includes(u.pathname));assert.equal(init.headers['x-review-studio-owner'],'1');return new Response(null,{status:401});};
 return {calls,fetcher};
}
test('postdeploy smoke validates exact staging build and denies forged signed-out headers',async()=>{const f=fixture();const r=await checkStaging(expected,f);assert.equal(r.sourceCommit,expected.sourceCommit);assert.equal(r.checks,privatePaths.length+6);assert.equal(f.calls.length,r.checks);});
test('wrong build, off-origin redirect and private leak all fail closed',async()=>{for(const [path,response] of [['/site-build-info.json',()=>Response.json({...expected,sourceCommit:'b'.repeat(40)})],['/',()=>new Response(null,{status:303,headers:{location:'https://example.test/auth/sign-in'}})],['/api/progress',()=>Response.json({})]])await assert.rejects(checkStaging(expected,fixture({[path]:response})));await assert.rejects(checkStaging({...expected,environment:'production'},fixture()),/staging build/);});
test('bounded retries never change deployment or issue writes',async()=>{let tries=0,waits=0;const f=fixture({'/staging/health':()=>{tries++;return new Response(null,{status:503})}});await assert.rejects(runStagingSmoke(expected,{fetcher:f.fetcher,attempts:3,wait:async()=>waits++}),/smoke failed/);assert.equal(tries,3);assert.equal(waits,2);});

test('live edge header assertions reject unsafe CSP, caching, MIME and CORS',()=>{
 const safe={'Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
 assert.equal(verifyStagingSecurityHeaders(new Response('',{headers:safe})),true);
 for(const [key,value] of [['Content-Security-Policy',"default-src 'self'"],['Cache-Control','public, max-age=60'],['X-Content-Type-Options',''],['Referrer-Policy','unsafe-url'],['Access-Control-Allow-Origin','*']]){
  const response=new Response('',{headers:{...safe,[key]:value}});assert.throws(()=>verifyStagingSecurityHeaders(response));
 }
});
