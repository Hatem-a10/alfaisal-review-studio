import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const placeholder='00000000-0000-4000-8000-000000000000';
const productionName='review-studio-production';
const stagingId=JSON.parse(readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url))).d1_databases[0].database_id;

const ACCESS_MODES=['open','restricted'];

// access: the REVIEW_STUDIO_ACCESS value for the release. Must be explicit, because the
// live production Worker runs 'open' while the built template is always 'restricted'.
export function candidateConfig(config,databaseId,access){
 if(!ACCESS_MODES.includes(access))throw Error('Supply the production access mode explicitly: open or restricted.');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(databaseId||'')||
    databaseId===stagingId||databaseId===placeholder)throw Error('Supply the verified production D1 resource ID.');
 if(config.name!==productionName || config.workers_dev!==false || config.preview_urls!==false || config.route || config.routes?.length ||
    config.observability?.logs?.invocation_logs!==false ||
    config.vars?.REVIEW_STUDIO_DEPLOYMENT!=='production' || config.vars.REVIEW_STUDIO_AUTH_PROVIDER!=='clerk' ||
    config.vars.REVIEW_STUDIO_ACCESS!=='restricted' || config.vars.REVIEW_STUDIO_OWNER_REAUTH!=='1' ||
    config.d1_databases?.length!==1 || config.d1_databases[0].binding!=='DB' ||
    config.d1_databases[0].database_name!==productionName || config.d1_databases[0].database_id!==placeholder ||
    config.r2_buckets?.length!==1 || config.r2_buckets[0].binding!=='BUCKET' || config.r2_buckets[0].bucket_name!==productionName){
  throw Error('Build the isolated, restricted production candidate first.');
 }
 return {...config,vars:{...config.vars,REVIEW_STUDIO_ACCESS:access},d1_databases:[{...config.d1_databases[0],database_id:databaseId}]};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [, , databaseId, approvedSha, flag, access]=process.argv;
 if(process.argv.length!==6||flag!=='--access'||!/^[a-f0-9]{40}$/.test(approvedSha||''))throw Error('Usage: node scripts/prepare-production-config.mjs <verified production D1 UUID> <review-approved full commit SHA> --access <open|restricted>  (production currently runs open)');
 const git=(...args)=>spawnSync('git',args,{encoding:'utf8'}).stdout?.trim();
 const build=JSON.parse(readFileSync('dist/client/site-build-info.json','utf8'));
 if(git('rev-parse','HEAD')!==approvedSha||git('status','--porcelain')!==''||build.environment!=='production'||build.sourceCommit!==approvedSha||build.sourceClean!==true){
  throw Error('Check out the clean approved source revision and rebuild the production candidate.');
 }
 const config=candidateConfig(JSON.parse(readFileSync('dist/server/wrangler.json','utf8')),databaseId,access);
 writeFileSync('dist/server/wrangler.production.prepared.json',JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(`Prepared an unrouted production configuration with REVIEW_STUDIO_ACCESS=${access}. No remote operation was executed.`);
}
