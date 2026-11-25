import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
export const stagingOrigin='https://review-studio-staging-20261117.hatema2169.workers.dev';
export const privatePaths=['/api/progress','/api/materials','/api/decks','/api/control-center/access','/api/account-key','/api/site-assets/materials/ren123/kidney-functions.pdf'];
export function validateExpectedBuild(expected){
 if(expected?.environment!=='staging'||!(/^[a-f0-9]{40}$/.test(expected.sourceCommit||''))||typeof expected.displayVersion!=='string'||!expected.displayVersion)throw Error('A staging build with exact source commit and display version is required.');
}
export async function checkStaging(expected,{fetcher=fetch}={}){
 validateExpectedBuild(expected);
 const get=async(path,headers={})=>fetcher(stagingOrigin+path,{method:'GET',redirect:'manual',cache:'no-store',headers:{'Cache-Control':'no-cache',...headers},signal:AbortSignal.timeout(15000)});
 const json=async(path)=>{const r=await get(path);if(r.status!==200)throw Error(path+' returned '+r.status);return r.json();};
 const health=await json('/staging/health');
 if(health.environment!=='staging'||health.authentication!=='clerk'||health.database!==true||health.storage!==true)throw Error('Staging environment or bindings not verified.');
 const info=await json('/site-build-info.json?verify='+expected.sourceCommit);
 if(info.environment!=='staging'||info.sourceCommit!==expected.sourceCommit||info.displayVersion!==expected.displayVersion)throw Error('Hosted staging build does not match expected source/version.');
 const session=await json('/auth/session');
 if(session.authenticated!==false)throw Error('Signed-out smoke must not have an authenticated session.');
 const home=await get('/');
 const location=home.headers.get('location');
 if(home.status!==303||!location||new URL(location,stagingOrigin).origin!==stagingOrigin||new URL(location,stagingOrigin).pathname!=='/auth/sign-in')throw Error('Signed-out home must redirect to staging sign-in.');
 const signIn=await get('/auth/sign-in');
 if(signIn.status!==200||!signIn.headers.get('content-type')?.includes('text/html'))throw Error('Staging sign-in page unavailable.');
 const caps=await json('/api/capabilities');
 if(caps.admin!==false||caps.adminSettingsUnlocked!==false)throw Error('Signed-out admin capability was granted.');
 for(const path of privatePaths){
  const r=await get(path,{'oai-authenticated-user-id':'synthetic-forged-smoke','x-review-studio-owner':'1'});
  if(r.status!==401&&r.status!==403)throw Error('Private endpoint '+path+' returned '+r.status+' rather than denying signed-out access.');
  await r.body?.cancel();
 }
 return {environment:'staging',sourceCommit:info.sourceCommit,displayVersion:info.displayVersion,checks:privatePaths.length+6};
}
export async function runStagingSmoke(expected,{attempts=4,wait=delay,fetcher=fetch}={}){
 validateExpectedBuild(expected);
 let error;for(let i=0;i<attempts;i++){try{return await checkStaging(expected,{fetcher})}catch(e){error=e;if(i+1<attempts)await wait(5000)}}
 throw Error('Post-deployment staging smoke failed: '+error.message);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const expected=JSON.parse(readFileSync('dist/client/site-build-info.json','utf8'));
 console.log(JSON.stringify(await runStagingSmoke(expected)));
}
