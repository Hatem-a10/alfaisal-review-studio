export function storageCategory(path){
 if(path.startsWith('client/anatomy-models/')||/^client\/heart-viewer/.test(path))return 'models';
 if(/^client\/[^/]*figures\//.test(path))return 'figures';
 if(/^client\/(_studio\/(reading-|search-index-|source-index-)|lab-readings\/)|^client\/[^/]*-sources\.json$/.test(path))return 'readings';
 if(/^client\/(supplemental-objective-questions|lesson-expansion-data)\.json$/.test(path))return 'learning';
 if(path.startsWith('client/vendor/'))return 'tools';
 if(/^server\/|^client\/(_next\/|_studio\/(client-|styles-))|^client\/[^/]+\.(js|mjs|css|html)$/.test(path))return 'app';
 return 'other';
}

export function storageBreakdown(entries){
 const categories={models:0,figures:0,readings:0,learning:0,tools:0,app:0,other:0};
 const ranked=[];
 let modelOffloadBytes=0;
 for(const {path,bytes} of entries){
  const category=storageCategory(path);
  categories[category]+=bytes;
  if(path.startsWith('client/anatomy-models/')&&path.endsWith('.glb.gz'))modelOffloadBytes+=bytes;
  ranked.push({path,bytes,category});
 }
 ranked.sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path));
 return {categories,largest:ranked.slice(0,8),modelOffloadBytes};
}
