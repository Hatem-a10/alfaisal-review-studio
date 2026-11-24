import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const header='// Generated losslessly from public/learning-data.js by scripts/learning-payload.mjs.\nexport const payload = ';
export function generatedLearningPayload(gzip){return header+JSON.stringify(gzip.toString('base64'))+';\n'}
export function reusableLearningPayload(source,input,decompress=gunzipSync){
 if(!source.startsWith(header)||!source.endsWith(';\n'))return false;
 const body=source.slice(header.length,-2);
 if(!/^"[A-Za-z0-9+/]+={0,2}"$/.test(body))return false;
 try{
  const bytes=Buffer.from(JSON.parse(body),'base64');
  return bytes.length>0&&generatedLearningPayload(bytes)===source&&decompress(bytes).equals(input);
 }catch{return false}
}
export function buildLearningPayload({inputPath=root+'public/learning-data.js',outputPath=root+'lib/learning-payload.ts',compress=gzipSync,decompress=gunzipSync}={}){
 const input=readFileSync(inputPath);
 // A5-101: an existing generated gzip is itself a validated cache entry.
 // Verify that its decompressed bytes exactly match source before skipping CPU work.
 const prior=existsSync(outputPath)?readFileSync(outputPath,'utf8'):null;
 if(prior!==null&&reusableLearningPayload(prior,input,decompress))return false;
 const gzip=compress(input,{level:9});
 if(!decompress(gzip).equals(input))throw Error('Learning data compression did not round-trip');
 const source=generatedLearningPayload(gzip);
 if(source!==prior)writeFileSync(outputPath,source);
 return true;
}
export function finalizeLearningPayload(){const path=root+'dist/client/learning-data.js';if(existsSync(path))unlinkSync(path)}
