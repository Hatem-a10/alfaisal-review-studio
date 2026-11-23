// Omit the argument to advance the Cloudflare release by one build number.
// Native Sites releases may still pass their publisher build number explicitly.
import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../public/site-release.json',import.meta.url);
const version=process.argv[2]===undefined?JSON.parse(readFileSync(file)).siteVersion+1:Number(process.argv[2]);
if(!Number.isSafeInteger(version)||version<1)throw Error('Supply a valid site build number.');
const display='v'+(version/100).toFixed(2);writeFileSync(file,JSON.stringify({siteVersion:version,displayVersion:display})+'\n');
const html=new URL('../public/index.html',import.meta.url);writeFileSync(html,readFileSync(html,'utf8').replace(/(<span class="sync-version" id="siteVersion" title=")Site version \d+(">)[^<]+/,`$1Site version ${version}$2${display}`));console.log(display);

const policy=new URL('../public/phase3-cache-policy.mjs',import.meta.url);writeFileSync(policy,readFileSync(policy,'utf8').replace(/review-studio-sw-v[0-9.]+/,'review-studio-sw-'+display));
