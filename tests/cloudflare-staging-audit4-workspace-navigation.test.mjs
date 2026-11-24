import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {workspaceRoute,renalSessions,isCvpStudyItem} from '../public/course-workspace-core.mjs';
test('workspace parser rejects malformed non-string and empty trailing route components',()=>{
 for(const route of [null,{},['#archive'],'#archive/','#renal/','#mol/learning/'])assert.equal(workspaceRoute(route),null);
 assert.deepEqual(workspaceRoute('#archive'),{course:'CVP',view:'index'});
});
test('archived associations remain detectable when a legacy reference collection is malformed',()=>{
 assert.equal(isCvpStudyItem({lectureIds:'CVP-P1'}),true);
 assert.equal(isCvpStudyItem({references:{source:'cvp-transcript'}}),true);
 assert.equal(isCvpStudyItem({references:['cvp-transcript',null]}),true);
 assert.equal(isCvpStudyItem({references:123,lectureIds:{}}),false);
});
test('session selection tolerates invalid rows and distinct title-detail tuples',()=>{
 const a={course:'REN',kind:'anatomy',title:'a|b',detail:'c'},b={course:'REN',kind:'anatomy',title:'a',detail:'b|c'};
 assert.deepEqual(renalSessions([null,a,b,a,{course:'REN',kind:'anatomy',title:''}],()=>true,['anatomy']),[a,b]);
 assert.deepEqual(renalSessions(null,()=>true,['anatomy']),[]);
});
const nav=readFileSync(new URL('../public/studio-navigation.js',import.meta.url),'utf8');
function harness({blocked=false,selected='activity',view='dashboard'}={}){
 const writes=[],historyWrites=[],context={view,selected,ids:new Set(['activity','weakness','lectures']),filters:{status:'weak'},go(v){if(!blocked)context.view=v;return v},localStorage:{setItem:(...v)=>writes.push(v)},history:{replaceState:(...v)=>historyWrites.push(v)},location:{hash:'#other/lectures'},render(){}};
 const a=nav.indexOf(' function selectOther('),b=nav.indexOf(' window.mountOtherTools=',a),c=nav.indexOf(' function restore()'),d=nav.indexOf(' for(const e of',c);
 const api=runInNewContext(nav.slice(a,b)+nav.slice(c,d)+'\n({restore,getSelected:()=>selected})',context);
 return {context,writes,historyWrites,api};
}
test('rejected Other navigation does not replace current history or selection',()=>{
 const h=harness({blocked:true});h.context.go('weakness');assert.equal(h.api.getSelected(),'activity');assert.equal(h.historyWrites.length,0);
 const ok=harness();assert.equal(ok.context.go('weakness'),'weakness');assert.equal(ok.historyWrites[0][2],'#other/weakness');
});
test('browser restoration keeps selected preference and resets weak lecture filter',()=>{
 const h=harness();h.api.restore();assert.equal(h.context.view,'lectures');assert.equal(h.context.filters.status,'all');assert.equal(h.writes[0][1],'lectures');
});
test('workspace runtime guards unknown IDs before mutating context and validates selectors',()=>{
 const s=readFileSync(new URL('../public/course-workspace.mjs',import.meta.url),'utf8');
 assert.match(s,/Object.hasOwn\(courses,id\)/);assert.match(s,/!DATA.items.some\(item=>item.id===id\)/);
 assert.match(s,/Array.isArray\(item\?\.questions\)/);assert.match(s,/if\(!\['REN','MOL','all','today','midterm'\].includes\(filter\)\)return/);
});
