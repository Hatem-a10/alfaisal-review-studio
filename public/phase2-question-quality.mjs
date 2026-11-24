const cache=new WeakMap();
const array=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value:'';
const normalize=value=>text(value).normalize('NFKC').toLowerCase().replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/[^\p{L}\p{N}+.\-−<>=≤≥%/]+/gu,' ').trim();
const valid=q=>q&&typeof q==='object'&&!Array.isArray(q)&&typeof q.question==='string'&&q.question.trim()!==''&&(q.options===undefined||Array.isArray(q.options)&&q.options.every(v=>typeof v==='string'));
const canonical=q=>[q?.canonicalId,q?.bookletCanonicalId,q?.duplicateOf].find(v=>typeof v==='string'&&v.trim())||null;
const criticalWord=t=>/^(?:no|not|never|except|unless|correct|incorrect|true|false|normal|abnormal|positive|negative|present|absent|with|without|increased|decreased|increase|decrease|more|less|most|least|higher|lower|above|below|before|after|left|right|afferent|efferent)$/.test(t)||/[\p{N}+−\-<>=≤≥%/\p{Script=Greek}]/u.test(t);
function parsed(q){
 const stemText=text(q.question),options=array(q.options).map(normalize),choices=JSON.stringify([...options].sort());
 const visual=JSON.stringify([text(q.image),text(q.figure?.image||q.figure?.src),...array(q.figures).map(f=>text(f?.image||f?.src))].filter(Boolean));
 const answer=Number.isSafeInteger(q.answer)&&q.answer>=0&&q.answer<options.length?options[q.answer]:null;
 const prior=cache.get(q);if(prior?.text===stemText&&prior.choices===choices&&prior.visual===visual&&prior.answer===answer)return prior;
 const words=normalize(stemText).split(/\s+/).filter(Boolean),critical=JSON.stringify(words.filter(criticalWord)),result={text:stemText,words,critical,stem:words.join(' '),choices,visual,answer};
 cache.set(q,result);return result;
}
const exactStem=p=>JSON.stringify([p.stem,p.choices,p.visual,p.answer]);
export function duplicateKey(q){if(!valid(q))return null;return canonical(q)||exactStem(parsed(q))}
// Only small ordered token edits are eligible for fuzzy deduplication; equal bags
// of words are not evidence that a clinical comparison or causal statement is equal.
function closeSequence(a,b){
 const n=a.length,m=b.length,limit=Math.floor(Math.max(n,m)*.04+1e-9);
 if(Math.abs(n-m)>limit)return false;
 if(!limit)return n===m&&a.every((word,i)=>word===b[i]);
 let prev=new Map();for(let j=0;j<=Math.min(m,limit);j++)prev.set(j,j);
 for(let i=1;i<=n;i++){
  const curr=new Map(),lo=Math.max(0,i-limit),hi=Math.min(m,i+limit);
  if(lo===0)curr.set(0,i);
  for(let j=Math.max(1,lo);j<=hi;j++)curr.set(j,Math.min((prev.get(j)??Infinity)+1,(curr.get(j-1)??Infinity)+1,(prev.get(j-1)??Infinity)+Number(a[i-1]!==b[j-1])));
  if(![...curr.values()].some(v=>v<=limit))return false;prev=curr;
 }
 return (prev.get(m)??Infinity)<=limit;
}
function nearParsed(x,y,familyA,familyB){
 if(x.answer!==y.answer)return false;
 if(familyA&&familyA===familyB)return true;
 if(x.choices!==y.choices||x.visual!==y.visual)return false;
 if(x.stem===y.stem)return !!x.stem;
 if(x.words.length<12||y.words.length<12||Math.abs(x.words.length-y.words.length)>2||x.critical!==y.critical)return false;
 return closeSequence(x.words,y.words);
}
export function nearDuplicate(a,b){
 if(!valid(a)||!valid(b))return false;
 return nearParsed(parsed(a),parsed(b),canonical(a),canonical(b));
}
export function deduplicateQuestions(questions){
 const kept=[],exact=new Set(),stems=new Set(),buckets=new Map();
 for(const q of array(questions)){
  if(!valid(q))continue;
  const p=parsed(q);if(!p.stem)continue;
  const family=canonical(q),key=family?JSON.stringify([family,p.answer]):null,stem=exactStem(p);
  if(key&&exact.has(key)||stems.has(stem))continue;
  const len=p.words.length,group=n=>JSON.stringify([p.critical,p.choices,p.visual,p.answer,n]);let duplicate=false;
  if(len>=12)for(let n=Math.max(12,len-2);n<=len+2&&!duplicate;n++)duplicate=(buckets.get(group(n))||[]).some(x=>nearParsed(x.parsed,p,x.family,family));
  if(duplicate)continue;
  kept.push(q);if(key)exact.add(key);stems.add(stem);
  const bucket=group(len);if(!buckets.has(bucket))buckets.set(bucket,[]);buckets.get(bucket).push({parsed:p,family});
 }
 return kept;
}
