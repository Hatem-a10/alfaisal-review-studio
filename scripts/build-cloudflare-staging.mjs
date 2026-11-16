import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync,writeFileSync,rmSync} from 'node:fs';
import {buildLearningPayload,finalizeLearningPayload} from './learning-payload.mjs';
import {optimizeClientScripts} from './client-scripts.mjs';
import {optimizeClientStyles} from './client-styles.mjs';
import {writeOfflineAssets} from './offline-assets.mjs';
const root=process.cwd(),cfg=JSON.parse(readFileSync('wrangler.staging.jsonc','utf8'));
if(cfg.name!=='review-studio-staging-20261117'||cfg.vars.REVIEW_STUDIO_DEPLOYMENT!=='staging'||cfg.routes?.length||cfg.d1_databases.some(x=>!x.database_name.startsWith('review-studio-staging-'))||cfg.r2_buckets.some(x=>!x.bucket_name.startsWith('review-studio-staging-')))throw Error('Unsafe staging configuration');
buildLearningPayload();
const result=spawnSync(process.execPath,['node_modules/vinext/dist/cli.js','build'],{stdio:'inherit',env:{...process.env,REVIEW_STUDIO_TARGET:'staging'}});if(result.status!==0)process.exit(result.status||1);
finalizeLearningPayload();const scripts=optimizeClientScripts(root);optimizeClientStyles(root);writeOfflineAssets(root);
// Sites proof receipts refer to another bucket; never use them to prune staging assets.
writeFileSync('dist/client/site-build-info.json',JSON.stringify({environment:'staging',siteVersion:165,displayVersion:'v1.65',migrated:false,privateMedia:{offloaded:false},startup:scripts,builtAt:new Date().toISOString()}));
// Keep public curriculum in the independent build, not in the old Sites bucket.
// Private resource paths are still guarded by the staging Worker before static assets.
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(built.name!==cfg.name||built.d1_databases[0].database_id!==cfg.d1_databases[0].database_id||built.r2_buckets[0].bucket_name!==cfg.r2_buckets[0].bucket_name)throw Error('Staging binding mismatch');
console.log('Independent staging build complete; production Sites config unchanged.');
