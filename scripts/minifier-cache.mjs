// A5-273: verified local build cache for deterministic esbuild minifier outputs.
// Keys include esbuild version, transform options and every byte of the source.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {transformSync,version as esbuildVersion} from 'esbuild';
const digest=data=>createHash('sha256').update(data).digest('hex');
export function cachedTransform(source,options,{cacheDir,transform=transformSync,version=esbuildVersion,io=fs}={}){
 if(typeof source!=='string'||!options||typeof options!=='object')throw Error('Invalid build transform');
 if(!cacheDir)return transform(source,options).code;
 const key=digest(version+'\0'+JSON.stringify(options)+'\0'+source);
 const file=path.join(cacheDir,key+'.txt'),proof=file+'.sha256';
 try{
  if(io.existsSync(file)&&io.existsSync(proof)){
   const content=io.readFileSync(file,'utf8');
   if(io.readFileSync(proof,'utf8')===digest(content))return content;
  }
 }catch{/* damaged/unreadable cache triggers a full transform */}
 const code=transform(source,options).code;
 io.mkdirSync(cacheDir,{recursive:true});
 io.writeFileSync(file,code);
 io.writeFileSync(proof,digest(code));
 return code;
}
