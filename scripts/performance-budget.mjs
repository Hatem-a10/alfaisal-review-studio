import {gzipSync} from 'node:zlib';
export const STARTUP_BUDGET={raw:7*1048576,gzip:1.55*1048576,requests:1};
export function checkStartupBudget(code,requests=1){const raw=Buffer.byteLength(code),gzip=gzipSync(code).length;if(raw>STARTUP_BUDGET.raw||gzip>STARTUP_BUDGET.gzip||requests>STARTUP_BUDGET.requests)throw Error('Startup payload exceeded its performance budget: '+raw+' raw bytes, '+gzip+' gzip bytes, '+requests+' requests. Defer new reading/content rather than growing the boot bundle.');return {raw,gzip,requests,budget:STARTUP_BUDGET}}
