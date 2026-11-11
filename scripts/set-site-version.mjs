// Read the next native Sites version before building; never infer it from Git.
import {readFileSync,writeFileSync} from 'node:fs';
const version=Number(process.argv[2]);if(!Number.isSafeInteger(version)||version<1)throw Error('Pass the next native Sites version number.');
const display='v'+(version/100).toFixed(2),file=new URL('../public/site-release.json',import.meta.url);writeFileSync(file,JSON.stringify({siteVersion:version,displayVersion:display})+'\n');
const html=new URL('../public/index.html',import.meta.url);writeFileSync(html,readFileSync(html,'utf8').replace(/(<span class="sync-version" id="siteVersion" title=")Site version \d+(">)[^<]+/,`$1Site version ${version}$2${display}`));console.log(display);
