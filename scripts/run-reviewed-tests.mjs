import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const {siteVersion}=JSON.parse(readFileSync('public/site-release.json','utf8'));
const targeted=[
 'admin-academics','admin-content','booklet-context','cloudflare-staging-audit3-cloud-integrity',
 'cloudflare-staging-audit5-progress-validation','cloudflare-staging-auth','course-workspace',
 'managed-startup-session','ospe','phase2-practice','registered-course-progress','study-next',
];
const full=siteVersion%5===0||process.argv.includes('--full');
const changed=new Set(spawnSync('git',['diff','--name-only','--diff-filter=ACMR','HEAD^','HEAD','--','tests'],{encoding:'utf8'}).stdout?.trim().split('\n')||[]);
const files=readdirSync('tests').filter(file=>file.endsWith('.test.mjs')&&
 (full||changed.has('tests/'+file)||targeted.includes(file.slice(0,-9))));
console.log('v'+(siteVersion/100).toFixed(2)+' · '+files.length+' '+(full?'full-suite':'targeted')+' test files');
const result=spawnSync(process.execPath,['--test',...files.map(file=>'tests/'+file)],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
