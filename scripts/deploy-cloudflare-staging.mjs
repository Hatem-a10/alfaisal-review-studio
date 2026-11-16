import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const source=JSON.parse(readFileSync('wrangler.staging.jsonc')),built=JSON.parse(readFileSync('dist/server/wrangler.json'));
for(const config of [source,built])if(config.name!=='review-studio-staging-20261117'||config.vars.REVIEW_STUDIO_DEPLOYMENT!=='staging'||config.routes?.length||config.d1_databases[0].database_id!=='1540bad8-aa39-4c73-9484-28cfd5ea2a05'||config.r2_buckets[0].bucket_name!=='review-studio-staging-20261117')throw Error('Refusing non-staging deployment');
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','dist/server/wrangler.json'],{stdio:'inherit'});if(result.error)throw result.error;process.exit(result.status??1);
