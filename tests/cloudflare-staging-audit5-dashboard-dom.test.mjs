import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=source.indexOf('let lastDashboardRoot=null'),end=source.indexOf('function go(v)',begin);
assert.ok(begin>=0&&end>begin);
const candidate=source.slice(begin,end);
const baseline=`function render(){if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return;if(typeof applyTheme==='function')applyTheme();if(typeof paintProfile==='function')paintProfile();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#content').innerHTML=({dashboard,lectures,weakness:lectures,calendar,methods,sources,planner,practice,learning:()=>typeof learning==='function'?learning():'Loading lessons…',library:()=>typeof library==='function'?library():'Loading library…',anki:()=>typeof ankiPage==='function'?ankiPage():'Loading decks…',studyhub:()=>typeof studyHub==='function'?studyHub():'Loading study tools…'}[view])();if(view==='lectures'||view==='weakness')results();updateDueBadge()}`;
function create(source){
 const observations={theme:0,profile:0,badges:0,results:0,writes:0},nav=[{dataset:{view:'dashboard'},active:false,classList:{toggle(_key,v){nav[0].active=v}}},{dataset:{view:'lectures'},active:false,classList:{toggle(_key,v){nav[1].active=v}}}];
 let sentinel=null,markup='',content='<section>Dashboard</section>';
 const root={get innerHTML(){return markup},set innerHTML(value){markup=value;sentinel=value?{}:null;observations.writes++},get firstElementChild(){return sentinel}};
 const context=vm.createContext({
  view:'dashboard',window:{reviewBootRender:true},document:{documentElement:{dataset:{boot:'complete'}},querySelectorAll:selector=>selector==='nav button'?nav:[]},
  applyTheme:()=>observations.theme++,paintProfile:()=>observations.profile++,updateDueBadge:()=>observations.badges++,results:()=>observations.results++,
  $:selector=>{assert.equal(selector,'#content');return root},
  dashboard:()=>content,lectures:()=>'<section>Lectures</section>',calendar:()=>'<section>Calendar</section>',
  methods:()=>'<section>Methods</section>',sources:()=>'<section>Sources</section>',
  planner:()=>'<section>Planner</section>',practice:()=>'<section>Practice</section>',
  learning:()=>'<section>Learning</section>',library:()=>'<section>Library</section>',
  ankiPage:()=>'<section>Anki</section>',studyHub:()=>'<section>Hub</section>'
 });
 vm.runInContext(source+'\nthis.runRender=render',context);
 return {context,root,nav,observations,render:()=>context.runRender(),setView:view=>context.view=view,setDashboard:s=>content=s,clear:()=>root.innerHTML='',getHTML:()=>root.innerHTML,firstChild:()=>root.firstElementChild};
}
test('A5-034 unchanged dashboard markup leaves card nodes intact while all other rendering effects still occur',()=>{
 const before=create(baseline),after=create(candidate);
 for(let i=0;i<250;i++){before.render();after.render()}
 assert.equal(after.getHTML(),before.getHTML());
 assert.equal(before.observations.writes,250);assert.equal(after.observations.writes,1);
 for(const property of ['theme','profile','badges','results'])assert.equal(after.observations[property],before.observations[property],property);
 assert.equal(after.nav[0].active,true);
 console.log(JSON.stringify({label:'A5-034 repeated identical dashboard refresh',renders:250,DOMReplacementsBefore:250,DOMReplacementsAfter:1}));
});
test('A5-034 changes, view transitions, empty mount and loading guard invalidate no-op DOM reuse',()=>{
 const v=create(candidate),first=()=>v.firstChild();v.render();const original=first();v.render();assert.equal(first(),original);
 v.setDashboard('<section>Updated progress</section>');v.render();assert.notEqual(first(),original);assert.equal(v.getHTML(),'<section>Updated progress</section>');
 v.setView('lectures');v.render();assert.equal(v.getHTML(),'<section>Lectures</section>');
 v.setView('dashboard');v.render();const newDashboard=first();assert.equal(v.getHTML(),'<section>Updated progress</section>');assert.notEqual(newDashboard,original);
 v.clear();assert.equal(first(),null);v.render();assert.equal(v.getHTML(),'<section>Updated progress</section>');
 const tally=v.observations.writes;v.context.document.documentElement.dataset.boot='loading';v.context.window.reviewBootRender=false;v.render();assert.equal(v.observations.writes,tally);
});
test('A5-034 non-dashboard pages render exactly as before, including active buttons and results()',()=>{
 const a=create(baseline),b=create(candidate);
 for(const name of ['lectures','weakness','calendar','practice','learning','library','anki','studyhub','dashboard','dashboard']){
  a.setView(name);b.setView(name);a.render();b.render();assert.equal(b.getHTML(),a.getHTML(),name);
 }
 assert.deepEqual(b.nav.map(n=>n.active),a.nav.map(n=>n.active));
 assert.equal(b.observations.results,a.observations.results);
 assert.equal(b.observations.badges,a.observations.badges);
 assert.equal(b.observations.writes,a.observations.writes-1,'only the second identical dashboard repaint is skipped');
});
