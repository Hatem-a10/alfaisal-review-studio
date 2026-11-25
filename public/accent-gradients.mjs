/* Accent gradients. Students pick a whole gradient rather than a single colour, so buttons,
   rings, icon tiles and progress all come from one set of three stops:
   a = deep start, b = main colour (also the derived accent), c = the colour it turns into.
   Every b reads at least 4.5:1 and every c at least 3:1 against white text. */

export const GRADIENTS=[
 {id:'violet-dusk',name:'Violet dusk',a:'#24135e',b:'#5a3bd6',c:'#c42f8f'},
 {id:'ocean',name:'Ocean',a:'#071f4a',b:'#1859c4',c:'#0b8aa6'},
 {id:'lagoon',name:'Lagoon',a:'#032b33',b:'#0d7a8a',c:'#2e9b64'},
 {id:'forest',name:'Forest',a:'#0b2a1a',b:'#1f7a4a',c:'#5f8f1f'},
 {id:'emerald-sky',name:'Emerald sky',a:'#06322a',b:'#0e8065',c:'#2468c9'},
 {id:'sunset',name:'Sunset',a:'#4a0f2b',b:'#c2245a',c:'#e0631b'},
 {id:'ember',name:'Ember',a:'#3d0a0a',b:'#b3261e',c:'#d9741a'},
 {id:'rose-gold',name:'Rose gold',a:'#4a1630',b:'#b83a6a',c:'#b8762a'},
 {id:'berry',name:'Berry',a:'#3a0a3d',b:'#9c1f8c',c:'#e0346a'},
 {id:'orchid',name:'Orchid',a:'#2a0f52',b:'#8a2fc9',c:'#d6409f'},
 {id:'indigo-fire',name:'Indigo fire',a:'#140f4a',b:'#3f37c9',c:'#e0425a'},
 {id:'midnight-teal',name:'Midnight teal',a:'#0a1638',b:'#2a3fae',c:'#0f9a9a'},
 {id:'cobalt-mint',name:'Cobalt mint',a:'#0a1a4a',b:'#2350d6',c:'#11a07a'},
 {id:'plum-peach',name:'Plum peach',a:'#33103f',b:'#7d2a8f',c:'#e0603a'},
 {id:'crimson-violet',name:'Crimson violet',a:'#3a0716',b:'#c0193f',c:'#6a2fd6'},
 {id:'copper',name:'Copper',a:'#2e1306',b:'#a3461a',c:'#c47a12'},
 {id:'olive-gold',name:'Olive gold',a:'#1f2408',b:'#5f7a14',c:'#b0861a'},
 {id:'slate-azure',name:'Slate azure',a:'#0f1a2a',b:'#36507a',c:'#1f86c9'},
 {id:'graphite-rose',name:'Graphite rose',a:'#16161c',b:'#4a4a5e',c:'#c23a6a'},
 {id:'aurora',name:'Aurora',a:'#062a3a',b:'#0e8173',c:'#7a3fe0'},
 {id:'tropical',name:'Tropical',a:'#05303a',b:'#0a7e8d',c:'#e04a6a'},
 {id:'magenta-blue',name:'Magenta blue',a:'#2a0a4a',b:'#c21f9c',c:'#2f5fe0'},
 {id:'nebula',name:'Nebula',a:'#0a0a3a',b:'#4a2fe0',c:'#1d96d3'},
 {id:'cherry',name:'Cherry',a:'#3a0614',b:'#b0103a',c:'#e03a8a'},
 {id:'pine-amber',name:'Pine amber',a:'#08261c',b:'#16704f',c:'#c9741a'},
 {id:'steel-teal',name:'Steel teal',a:'#13212b',b:'#3a5a6e',c:'#138f8f'},
];

const byId=new Map(GRADIENTS.map(g=>[g.id,g]));
export const gradientById=id=>byId.get(id)||null;

const channels=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
/** A colour chosen before gradients existed maps to the closest gradient by its main colour. */
export function nearestGradient(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex||''))return GRADIENTS[0];
 const [r,g,b]=channels(hex);let best=GRADIENTS[0],score=Infinity;
 for(const item of GRADIENTS){const [x,y,z]=channels(item.b),d=(r-x)**2*2+(g-y)**2*4+(b-z)**2*3;if(d<score){score=d;best=item}}
 return best;
}

const swatch=g=>`linear-gradient(125deg,${g.a} 0%,${g.b} 30%,${g.c} 78%)`;

/**
 * A radio group of gradient swatches. "Auto" follows the next assessment's colours.
 * onPick receives a gradient, or null for Auto.
 */
export function mountGradientPicker(host,{selected,onPick,auto=true,label='Accent gradient'}){
 const group=document.createElement('div');group.className='gradient-picker';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label);
 const options=[...(auto?[{id:'auto',name:'Auto · next assessment'}]:[]),...GRADIENTS];
 group.innerHTML=options.map(g=>`<button type="button" role="radio" class="gradient-swatch${g.id==='auto'?' is-auto':''}" data-gradient="${g.id}" title="${g.name}" aria-label="${g.name}"${g.id==='auto'?'':` style="--swatch:${swatch(g)}"`}><span aria-hidden="true"></span></button>`).join('');
 const paint=id=>{for(const b of group.querySelectorAll('[role=radio]')){const on=b.dataset.gradient===id;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1}if(!group.querySelector('[aria-checked=true]'))group.querySelector('[role=radio]').tabIndex=0};
 paint(selected);
 group.addEventListener('click',e=>{const b=e.target.closest('[data-gradient]');if(!b)return;paint(b.dataset.gradient);onPick(b.dataset.gradient==='auto'?null:gradientById(b.dataset.gradient))});
 group.addEventListener('keydown',e=>{
  const keys={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1};if(!(e.key in keys))return;e.preventDefault();
  const all=[...group.querySelectorAll('[role=radio]')],at=all.indexOf(document.activeElement),next=all[(at+keys[e.key]+all.length)%all.length];
  next.focus();next.click();
 });
 host.append(group);
 return {group,select:paint};
}

/** The gradient a student's saved settings resolve to, or null when Auto is on. */
export function chosenGradient(settings){
 if(settings?.accentAuto!==false)return null;
 return gradientById(settings.accentPalette)||nearestGradient(settings.accent);
}


// Assessment colors use the same collection as the appearance picker.
export const ASSESSMENT_GRADIENTS=['violet-dusk','ocean','sunset','lagoon','copper','emerald-sky','orchid','ember'];
