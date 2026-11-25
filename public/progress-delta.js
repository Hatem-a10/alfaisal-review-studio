'use strict';
const ProgressDelta=(()=>{
 const safe=k=>typeof k==='string'&&!['__proto__','constructor','prototype'].includes(k),obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function checkValue(value){const stack=[[value,0]];while(stack.length){const [v,depth]=stack.pop();if(depth>64)throw Error('Progress value is too deeply nested');if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))continue;if(typeof v!=='object'||!v)throw Error('Invalid progress value');for(const k of Object.keys(v)){if(!safe(k))throw Error('Unsafe progress field');stack.push([v[k],depth+1])}}}
 function diff(before,after){before=before==null?{}:JSON.parse(JSON.stringify(before));after=JSON.parse(JSON.stringify(after));const ops=[];function walk(a,b,path){if(JSON.stringify(a)===JSON.stringify(b))return;if(obj(a)&&obj(b)&&path.length<16){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(!safe(k))throw Error('Unsafe progress field');if(!Object.hasOwn(b,k))ops.push({path:[...path,k],remove:true});else if(!Object.hasOwn(a,k)){checkValue(b[k]);ops.push({path:[...path,k],value:b[k]})}else walk(a[k],b[k],[...path,k])}}else{checkValue(b);ops.push({path,value:b})}}for(const k of ['records','settings','extras'])if(Object.hasOwn(after,k))walk(before?.[k],after[k],[k]);return ops}
 function validate(ops){
  if(!Array.isArray(ops)||ops.length>8000)throw Error('Invalid patch size');
  const root={children:new Map(),end:false};
  for(const op of ops){
   if(!obj(op)||!Object.hasOwn(op,'path'))throw Error('Invalid patch operation');
   const p=op.path,remove=op.remove===true;
   if(!Array.isArray(p)||p.length<1||p.length>16||!['records','settings','extras'].includes(p[0])||p.some(k=>typeof k!=='string'||k.length>240||!safe(k)))throw Error('Invalid patch path');
   if(Object.keys(op).length!==2||!Object.hasOwn(op,remove?'remove':'value')||Object.hasOwn(op,remove?'value':'remove'))throw Error('Conflicting patch operation');
   if(remove&&p.length===1)throw Error('Cannot remove snapshot root');
   if(!remove)checkValue(op.value);
   let node=root;
   for(const part of p){if(node.end)throw Error('Overlapping patch paths');if(!node.children.has(part))node.children.set(part,{children:new Map(),end:false});node=node.children.get(part)}
   if(node.end||node.children.size)throw Error('Duplicate or overlapping patch paths');node.end=true;
  }
  return true;
 }
 function apply(snapshot,ops){
  validate(ops);
  const out=structuredClone(snapshot);
  for(const op of ops){
   const p=op.path;let x=out;
   for(const k of p.slice(0,-1)){if(!Object.hasOwn(x,k)||!obj(x[k]))throw Error('Missing patch parent');x=x[k]}
   const k=p.at(-1);
   if(op.remove===true){if(!Object.hasOwn(x,k))throw Error('Missing patch target');delete x[k]}
   else x[k]=structuredClone(op.value);
  }
  return out;
 }
 return {diff,apply,validate};
})();
