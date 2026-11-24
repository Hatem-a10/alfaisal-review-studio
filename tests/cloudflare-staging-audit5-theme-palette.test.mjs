import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {chosenGradient,nearestGradient,gradientById} from '../public/accent-gradients.mjs';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {deriveAccent} from '../public/phase1-accent.mjs';
const baseline="function themes(){const old=applyTheme;applyTheme=function(...args){const result=old.apply(this,args),root=document.documentElement,stain=Number(window.reviewNextStain?.()??0)%8,auto=typeof settings.accentAuto==='boolean'?settings.accentAuto:!(/^#[0-9a-f]{6}$/i.test(settings.accent||'')&&!DEFAULT_ACCENTS.test(settings.accent));root.dataset.stain=String(stain);root.dataset.accent=auto?'auto':'solid';for(const[key,value]of Object.entries(deriveAccent(auto?STAIN_ACCENTS[stain]:settings.accent,settings.theme==='amoled')))root.style.setProperty(key,value);return result};applyTheme()}";
const candidate=readFileSync(new URL('../public/phase1-runtime.mjs',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function themes()'));
const constants="const STAIN_ACCENTS=['#3a2f86','#245796','#8e2a6c','#226a8f','#5c4428','#246b52','#4d3a99','#93302d'];\nconst DEFAULT_ACCENTS=/^#(?:5b4bd0|2f6c52)$/i;";
function fixture(source){
 let derivations=0,writes=0,datasetWrites=0,stain=0;
 const properties=new Map(),priority=new Map(),dataset=new Proxy({}, {set(o,k,v){datasetWrites++;o[k]=v;return true}});
 const style={getPropertyValue:k=>properties.get(k)||'',getPropertyPriority:k=>priority.get(k)||'',setProperty(k,v,p=''){writes++;properties.set(k,v);priority.set(k,p)},removeProperty(k){properties.delete(k);priority.delete(k)}};
 const settings={accentAuto:false,accent:'#aabcdd',theme:'light'};
 // Simulate an earlier theme layer which occasionally changes an overlapping token.
 const ctx=vm.createContext({settings,document:{documentElement:{dataset,style}},window:{reviewNextStain:()=>stain},applyTheme:(conflict=false)=>{if(conflict)style.setProperty('--green','#ffffff');return 'preserved'},chosenGradient,deriveAccent:(...a)=>{derivations++;return deriveAccent(...a)}});
 vm.runInContext(constants+'\n'+source+'\nthemes();this.run=(v)=>applyTheme(v);',ctx);
 return {settings,run:ctx.run,setStain:v=>stain=v,style,state:()=>({dataset:{...dataset},properties:[...properties],priority:[...priority]}),counts:()=>({derivations,writes,datasetWrites})};
}
test('A5-217/A5-218 guarded root writes: chosen gradients set their stops, Auto clears them',()=>{
 const b=fixture(candidate);
 // A colour saved before gradients existed resolves to its nearest gradient.
 b.run();let st=b.state();const legacy=nearestGradient('#aabcdd');
 assert.equal(st.dataset.accent,'palette');assert.deepEqual(Object.fromEntries(st.properties.filter(([k])=>k.startsWith('--pal-'))),{'--pal-a':legacy.a,'--pal-b':legacy.b,'--pal-c':legacy.c});
 Object.assign(b.settings,{accentPalette:'sunset'});b.run();st=b.state();
 assert.equal(Object.fromEntries(st.properties)['--pal-c'],gradientById('sunset').c);
 Object.assign(b.settings,{accentAuto:true});b.setStain(3);assert.equal(b.run(),'preserved');st=b.state();
 assert.equal(st.dataset.accent,'auto');assert.equal(st.dataset.stain,'3');assert.ok(!st.properties.some(([k])=>k.startsWith('--pal-')));
 // An earlier layer's important override is restored to the derived value.
 b.style.setProperty('--accent','#123456','important');b.run();assert.equal(Object.fromEntries(b.state().priority)['--accent'],'');
});
function median(fn){fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]}
test('A5-217/A5-218 unchanged theme avoids repeated palette work and root assignments',()=>{
 const a=fixture(baseline),b=fixture(candidate);
 const run=x=>{for(let i=0;i<300;i++)x.run()};
 run(a);run(b);
 const beforeCounts=a.counts(),afterCounts=b.counts();assert.equal(beforeCounts.derivations,301);assert.equal(afterCounts.derivations,1);assert.equal(afterCounts.writes,20);assert.equal(afterCounts.datasetWrites,2);
 console.log(JSON.stringify({label:'A5-217/A5-218 unchanged theme combined',baselineMedianMs:median(()=>run(a)),candidateMedianMs:median(()=>run(b)),baseline:beforeCounts,candidate:afterCounts}));
});
