import vinext from 'vinext';
import {defineConfig} from 'vite';
import {configureToolEnvironment} from './scripts/tool-environment.mjs';
export default defineConfig(async()=>{
 configureToolEnvironment(process.cwd());
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {plugins:[vinext(),cloudflare({configPath:process.env.REVIEW_STUDIO_TARGET==='cloudflare-production'?'wrangler.production.jsonc':'wrangler.staging.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})],server:{host:'127.0.0.1',port:5174,watch:{usePolling:true}},};
});
