// Audit 5 synthetic capacity benchmarks only. Nothing here runs in production.
import {gzipSync,gunzipSync,brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {performance} from 'node:perf_hooks';
export function compressionProfile(payload){
 const bytes=Buffer.isBuffer(payload)?payload:Buffer.from(payload);
 const start=performance.now();
 const gzip=gzipSync(bytes,{level:6}),gzipMs=performance.now()-start;
 const brotliStart=performance.now();
 const brotli=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}),brotliMs=performance.now()-brotliStart;
 if(!gunzipSync(gzip).equals(bytes)||!brotliDecompressSync(brotli).equals(bytes))throw Error('Compression failed lossless verification');
 return {rawBytes:bytes.length,gzipBytes:gzip.length,brotliBytes:brotli.length,gzipMs,brotliMs,gzipSavedBytes:bytes.length-gzip.length,brotliSavedBytes:bytes.length-brotli.length};
}
export function boundedFixtureRows({sampleRows,sampleMs,targetMs=150,minRows=128,maxRows=20000}){
 if(![sampleRows,sampleMs,targetMs,minRows,maxRows].every(Number.isFinite)||sampleRows<=0||sampleMs<=0||targetMs<=0||minRows<1||maxRows<minRows)throw Error('Invalid benchmark budget');
 const estimate=Math.floor(sampleRows*targetMs/sampleMs);
 return Math.max(minRows,Math.min(maxRows,estimate));
}
export function sampleDurations(fn,{runs=9,clock=()=>performance.now()}={}){
 if(typeof fn!=='function'||!Number.isSafeInteger(runs)||runs<1||runs>64)throw Error('Invalid sample configuration');
 const samples=[];
 for(let i=0;i<runs;i++){const t=clock();fn();samples.push(Math.max(0,clock()-t))}
 const sorted=samples.slice().sort((a,b)=>a-b);
 return {count:runs,p50Ms:sorted[Math.ceil(runs*.5)-1],p95Ms:sorted[Math.ceil(runs*.95)-1],minMs:sorted[0],maxMs:sorted.at(-1)};
}
