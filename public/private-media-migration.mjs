const api='/api/private-media';
const fetchJson=async(url,options)=>{
 const response=await fetch(url,options),data=await response.json();
 if(!response.ok)throw Error(data.error||'Private storage request failed.');
 return data;
};

export async function syncPrivateMedia(status){
 let info=await fetchJson(api,{cache:'no-store'});
 let verified=info.verified,queue=info.pending.slice();
 while(queue.length){
  const batch=[];
  let bytes=0;
  while(queue.length&&batch.length<10&&bytes+queue[0].size<=10000000){
   const file=queue.shift();
   batch.push(file);
   bytes+=file.size;
  }
  if(!batch.length)throw Error('A file exceeds the transfer limit.');
  status.textContent='Copying and verifying '+verified+' / '+info.total+' files…';
  const files=await Promise.all(batch.map(async asset=>{
   const response=await fetch('/'+asset.path.split('/').map(encodeURIComponent).join('/'));
   if(!response.ok)throw Error('Could not read '+asset.path);
   return [asset.path,await response.blob()];
  }));
  const body=new FormData();
  for(const [path,file] of files)body.append(path,file,path.split('/').at(-1));
  const result=await fetchJson(api,{method:'POST',body});
  verified+=result.saved;
 }
 info=await fetchJson(api,{cache:'no-store'});
 if(info.verified!==info.total)throw Error('Verification is incomplete. Retry the transfer.');
 status.textContent=info.verified+' / '+info.total+' files verified · manifest '+info.manifestHash;
}
