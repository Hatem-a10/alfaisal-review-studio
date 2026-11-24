// A5-119: only ungraded search labels, stems and source metadata are indexed.
// All results remain within the origin's ephemeral dedicated worker.
import {buildIndex} from './phase1-search.mjs';
self.onmessage=event=>{
 try{
  const source=event.data?.source;
  if(!source||typeof source!=='object')throw Error('Invalid search source');
  self.postMessage({ok:true,index:buildIndex(source)});
 }catch{
  self.postMessage({ok:false});
 }
};
