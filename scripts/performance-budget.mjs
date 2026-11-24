import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
// Report deterministic estimates for emitted feature files, not observed transfer sizes.
export function measureEntry(code){const bytes=Buffer.from(code);return {raw:bytes.length,gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}).length}}
// Course content loads on demand (scripts/course-packs.mjs); only shared code and data belong in the boot bundle.
export const STARTUP_BUDGET={raw:1.25*1048576,gzip:0.35*1048576,requests:1};
export function checkStartupBudget(code,requests=1){const raw=Buffer.byteLength(code),gzip=gzipSync(code).length;if(raw>STARTUP_BUDGET.raw||gzip>STARTUP_BUDGET.gzip||requests>STARTUP_BUDGET.requests)throw Error('Startup payload exceeded its performance budget: '+raw+' raw bytes, '+gzip+' gzip bytes, '+requests+' requests. Put course content in its course pack (scripts/course-packs.mjs) or defer it, rather than growing the boot bundle.');return {raw,gzip,requests,budget:STARTUP_BUDGET}}
