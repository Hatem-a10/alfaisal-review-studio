// Read the next native Sites version before building; never infer it from Git.
import {readFileSync,writeFileSync} from 'node:fs';
const version=Number(process.argv[2]);if(!Number.isSafeInteger(version)||version<1)throw Error('Pass the next native Sites version number.');
const file=new URL('../public/site-release.json',import.meta.url),previous=JSON.parse(readFileSync(file,'utf8')),requested=process.argv[3];
if(requested&&!/^v\d+\.\d{2,3}$/.test(requested))throw Error('Display version must look like v1.50 or v1.495.');
const oldDisplay=Number(previous.displayVersion?.slice(1)),nextDisplay=previous.siteVersion===version?oldDisplay:previous.siteVersion+1===version?Math.floor(oldDisplay*100+1e-7)/100+.01:version/100;
const display=requested||'v'+nextDisplay.toFixed(2);writeFileSync(file,JSON.stringify({siteVersion:version,displayVersion:display})+'\n');
const html=new URL('../public/index.html',import.meta.url);writeFileSync(html,readFileSync(html,'utf8').replace(/(<span class="sync-version" id="siteVersion" title=")Site version \d+(">)[^<]+/,`$1Site version ${version}$2${display}`));console.log(display);
