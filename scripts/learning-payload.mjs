import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function buildLearningPayload(){const input=readFileSync(root+'public/learning-data.js'),gzip=gzipSync(input,{level:9});if(!gunzipSync(gzip).equals(input))throw Error('Learning data compression did not round-trip');const source='// Generated losslessly from public/learning-data.js by scripts/learning-payload.mjs.\nexport const payload = '+JSON.stringify(gzip.toString('base64'))+';\n';if(!existsSync(root+'lib/learning-payload.ts')||readFileSync(root+'lib/learning-payload.ts','utf8')!==source)writeFileSync(root+'lib/learning-payload.ts',source)}
export function finalizeLearningPayload(){const path=root+'dist/client/learning-data.js';if(existsSync(path))unlinkSync(path)}
