import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildLearningPayload,finalizeLearningPayload} from './learning-payload.mjs';
import {optimizeClientScripts} from './client-scripts.mjs';
import {optimizeClientStyles} from './client-styles.mjs';
import {writeOfflineAssets} from './offline-assets.mjs';
const root = process.cwd();
const production = process.argv[2] === '--production-candidate';
if (process.argv.length > (production ? 3 : 2)) throw Error('Unknown Cloudflare build option');
if (process.argv[2] && !production) throw Error('Unknown Cloudflare build option');
const environment = production ? 'production' : 'staging';
const cfg = JSON.parse(readFileSync(production ? 'wrangler.production.jsonc' : 'wrangler.staging.jsonc','utf8'));
const release = JSON.parse(readFileSync('public/site-release.json','utf8'));
const source=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
const status=spawnSync('git',['status','--porcelain'],{encoding:'utf8'});
const sourceCommit=source.status===0?source.stdout.trim():null;
const sourceClean=status.status===0&&status.stdout.trim()==='';
const log = spawnSync('git',['log','-10','--format=%h%x09%cI'],{encoding:'utf8'});
const releases = (log.stdout||'').trim().split('\n').filter(Boolean).map(line=>{
 const [commit,date] = line.split('\t');
 return {commit,date};
});
if(!production && (cfg.name!=='review-studio-staging-20261117'||cfg.vars.REVIEW_STUDIO_DEPLOYMENT!=='staging'||cfg.routes?.length||cfg.d1_databases.some(x=>!x.database_name.startsWith('review-studio-staging-'))||cfg.r2_buckets.some(x=>!x.bucket_name.startsWith('review-studio-staging-'))))throw Error('Unsafe staging configuration');
if (production && (cfg.name !== 'review-studio-production' ||
    cfg.vars.REVIEW_STUDIO_DEPLOYMENT !== 'production' || cfg.vars.REVIEW_STUDIO_AUTH_PROVIDER !== 'clerk' ||
    cfg.vars.REVIEW_STUDIO_ACCESS !== 'restricted' || cfg.vars.REVIEW_STUDIO_OWNER_REAUTH !== '1' ||
    cfg.workers_dev !== false || cfg.preview_urls !== false || cfg.routes?.length ||
    cfg.d1_databases.length !== 1 || cfg.d1_databases[0].database_name !== 'review-studio-production' ||
    cfg.d1_databases[0].database_id !== '00000000-0000-4000-8000-000000000000' ||
    cfg.r2_buckets.length !== 1 || cfg.r2_buckets[0].bucket_name !== 'review-studio-production')) {
 throw Error('The local production candidate requires isolated placeholder bindings and no routes');
}
buildLearningPayload();
const result=spawnSync(process.execPath,['node_modules/vinext/dist/cli.js','build'],{stdio:'inherit',env:{...process.env,REVIEW_STUDIO_TARGET:production ? 'cloudflare-production' : 'staging'}});if(result.status!==0)process.exit(result.status||1);
finalizeLearningPayload();const scripts=optimizeClientScripts(root);optimizeClientStyles(root);writeOfflineAssets(root);
// Sites proof receipts refer to another bucket; never use them to prune staging assets.
writeFileSync('dist/client/site-build-info.json',JSON.stringify({environment,sourceCommit,sourceClean,releases,siteVersion:release.siteVersion,displayVersion:release.displayVersion,migrated:false,privateMedia:{offloaded:false},startup:scripts,builtAt:new Date().toISOString()}));
// Keep public curriculum in the independent build, not in the old Sites bucket.
// Private resource paths are still guarded by the staging Worker before static assets.
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(built.vars.REVIEW_STUDIO_DEPLOYMENT!==environment||built.name!==cfg.name||built.d1_databases[0].database_id!==cfg.d1_databases[0].database_id||built.r2_buckets[0].bucket_name!==cfg.r2_buckets[0].bucket_name)throw Error('Cloudflare binding mismatch');
if (production && (built.vars.REVIEW_STUDIO_ACCESS !== 'restricted' || built.vars.REVIEW_STUDIO_OWNER_REAUTH !== '1' || built.workers_dev !== false || built.preview_urls !== false || built.routes?.length)) {
 throw Error('Production candidate unexpectedly exposes routes');
}
console.log('Cloudflare '+environment+' build complete.');
