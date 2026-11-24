import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync,brotliCompressSync,constants} from 'node:zlib';import {measureEntry} from '../scripts/performance-budget.mjs';
test('A5-271 measures emitted feature bytes and uses explicitly configured Brotli quality',()=>{
 const source='α → β;'.repeat(500),bytes=Buffer.from(source);
 assert.deepEqual(measureEntry(source),{raw:bytes.length,gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}).length});
 assert.deepEqual(measureEntry(source),measureEntry(bytes));
});
