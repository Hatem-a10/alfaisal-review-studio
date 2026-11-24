import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const oldFigure=" function stationFigure(s,showLabels=false,zoom=false){\n  if(s.figures){\n   const images=s.figures.map((f,i)=>'<img class=\"ospe-station-image\" src=\"'+esc(f.image)+'\" alt=\"Station figure '+(i+1)+'\" width=\"'+f.width+'\" height=\"'+f.height+'\">').join('');\n   return zoom?images:'<figure class=\"ospe-image\">'+images+'<figcaption>Renal past-paper booklet · p'+s.page+'</figcaption><button data-ospe-zoom=\"'+s.id+'\">Enlarge image</button></figure>';\n  }\n  const t=s.imageTask,w=t.width,h=t.height,n=x=>Number(x)||0;\n  const masks=showLabels?'':(t.masks||[]).map(m=>'<rect class=\"ospe-image-mask\" x=\"'+n(m.x)*w+'\" y=\"'+n(m.y)*h+'\" width=\"'+n(m.w)*w+'\" height=\"'+n(m.h)*h+'\" rx=\"2\" fill=\"#e6e8eb\" stroke=\"#a1a6ad\" stroke-width=\".5\"/>').join('');\n  const arrows=(t.arrows||[]).map(a=>{const x=n(a.x1)*w,y=n(a.y1)*h,tx=n(a.x2)*w,ty=n(a.y2)*h,size=Math.max(10,w*.018);const angle=Math.atan2(ty-y,tx-x),dx=Math.cos(angle),dy=Math.sin(angle);return '<path d=\"M '+x+' '+y+' L '+tx+' '+ty+' M '+(tx-size*dx+size*.5*dy)+' '+(ty-size*dy-size*.5*dx)+' L '+tx+' '+ty+' L '+(tx-size*dx-size*.5*dy)+' '+(ty-size*dy+size*.5*dx)+'\" fill=\"none\" stroke=\"#139bcb\" stroke-width=\"'+Math.max(3,w*.004)+'\"/><circle cx=\"'+x+'\" cy=\"'+y+'\" r=\"'+size+'\" fill=\"#0878a3\"/><text x=\"'+x+'\" y=\"'+(y+size*.37)+'\" text-anchor=\"middle\" fill=\"white\" font-size=\"'+size*1.3+'\" font-family=\"Arial\">'+esc(a.label||'A')+'</text>'}).join('');\n  const svg='<svg class=\"ospe-station-image\" viewBox=\"0 0 '+w+' '+h+'\" role=\"img\" aria-label=\"'+(showLabels?'Source image with labels revealed':'Station image with answer labels covered')+'\"><image href=\"'+esc(s.figure)+'\" width=\"'+w+'\" height=\"'+h+'\"/>'+masks+arrows+'</svg>';\n  if(zoom)return svg;\n  const source=pack.sources.find(x=>x.id===s.figureReference?.source),credit=source?source.title+' · p/slide '+s.figureReference.page:'Source-based diagram';\n  return '<figure class=\"ospe-image\">'+svg+'<figcaption>'+esc(credit)+' · '+(showLabels?'Original labels revealed':(t.masks?.length?'Only answer labels covered':'Question image'))+'</figcaption><button data-ospe-zoom=\"'+s.id+'\">Enlarge image</button></figure>';\n }\n";
const source=readFileSync(new URL('../public/ospe.js',import.meta.url),'utf8');
const newFigure=source.slice(source.indexOf(' const stationMarkupCache='),source.indexOf(' function input(',source.indexOf(' const stationMarkupCache=')));
function fixture(code){
 let sourceLookups=0;
 const sources=[{id:'renal-guides',title:'Renal Lab Guide 2026'}];
 sources.find=function(...args){sourceLookups++;return Array.prototype.find.apply(this,args)};
 const ctx=vm.createContext({pack:{sources},esc:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;'),WeakMap,Map,Number,Math});
 vm.runInContext(code+'\nthis.renderStation=stationFigure',ctx);
 return {render:ctx.renderStation,sourceLookups:()=>sourceLookups};
}
const stations=[
 {id:'REN-Q1',page:4,figures:[{image:'/api/study-assets/s1',width:800,height:600},{image:'/api/study-assets/s2',width:500,height:400}]},
 {id:'CVP-OSPE1',figure:'/api/study-assets/figure-123',figureReference:{source:'renal-guides',page:12},imageTask:{width:800,height:640,masks:[{x:.12,y:.2,w:.21,h:.18}],arrows:[{x1:.15,y1:.3,x2:.4,y2:.44,label:'A'}]}},
 {id:'CVP-OSPE2',figure:'/api/study-assets/figure-456',figureReference:{source:'missing',page:3},imageTask:{width:600,height:500,masks:[],arrows:[]}}
];
test('A5-162 exact source figure HTML in all answer reveal and zoom variants',()=>{
 const before=fixture(oldFigure),after=fixture(newFigure);
 for(const station of stations)for(const show of [false,true])for(const zoom of [false,true]){
  assert.equal(after.render(station,show,zoom),before.render(station,show,zoom));
 }
 assert.match(source,/const stationMarkupCache=new WeakMap\(\)/);
 assert.match(source,/const html=uncachedStationFigure\(s,showLabels,zoom\)/);
});
test('A5-162 repeated navigation uses immutable figure metadata once per station mode',()=>{
 const before=fixture(oldFigure),after=fixture(newFigure),station=stations[1];
 for(let i=0;i<300;i++)assert.equal(after.render(station,false,false),before.render(station,false,false));
 assert.equal(before.sourceLookups(),300);
 assert.equal(after.sourceLookups(),1);
 for(let i=0;i<300;i++)after.render(station,true,false);
 assert.equal(after.sourceLookups(),2);
 for(let i=0;i<300;i++)after.render(station,false,true);
 assert.equal(after.sourceLookups(),2,'zoom returns before source lookup');
 console.log(JSON.stringify({label:'A5-162 repeated static OSPE figure navigation',visits:300,sourceMetadataLookupsBefore:300,after:1,revealModesIsolated:true}));
});
test('A5-162 cache never combines distinct station images or answer reveal modes',()=>{
 const next=fixture(newFigure);
 const normal=next.render(stations[1],false,false),revealed=next.render(stations[1],true,false),other=next.render(stations[2],false,false);
 assert.notEqual(normal,revealed);assert.notEqual(other,normal);
 assert.match(normal,/ospe-image-mask/);
 assert.doesNotMatch(revealed,/ospe-image-mask/);
 assert.match(other,/figure-456/);
});
