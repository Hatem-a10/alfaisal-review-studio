'use strict';
const ProgressDelta=(()=>{
 const safe=k=>!['__proto__','constructor','prototype'].includes(k),obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 function diff(before,after){const ops=[];function walk(a,b,path){if(JSON.stringify(a)===JSON.stringify(b))return;if(obj(a)&&obj(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(!safe(k))throw Error('Unsafe progress field');if(!(k in b))ops.push({path:[...path,k],remove:true});else if(!(k in a))ops.push({path:[...path,k],value:b[k]});else walk(a[k],b[k],[...path,k])}}else ops.push({path,value:b})}for(const k of ['records','settings','extras'])if(k in after)walk(before?.[k],after[k],[k]);return ops}
 function apply(snapshot,ops){if(!Array.isArray(ops)||ops.length>8000)throw Error('Invalid patch size');const out=structuredClone(snapshot);for(const op of ops){const p=op.path;if(!Array.isArray(p)||p.length<1||p.length>16||!['records','settings','extras'].includes(p[0])||p.some(k=>typeof k!=='string'||k.length>240||!safe(k)))throw Error('Invalid patch path');let x=out;for(const k of p.slice(0,-1)){if(!obj(x[k]))throw Error('Missing patch parent');x=x[k]}const k=p.at(-1);if(op.remove===true){if(p.length===1)throw Error('Cannot remove snapshot root');delete x[k]}else{if(!Object.hasOwn(op,'value'))throw Error('Missing patch value');x[k]=structuredClone(op.value)}}return out}
 return {diff,apply};
})();
