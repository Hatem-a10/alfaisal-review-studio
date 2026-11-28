import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync('public/'+f,'utf8');
test('lesson counts match visible search results, deduplicate passes and ignore omitted thirds',()=>{
 const mastered=new Set();
 const items=[{id:'a',course:'CVP',code:'P1',title:'Heart'},{id:'b',course:'CVP',code:'P2',title:'Lung'},{id:'c',course:'MOL',code:'MOL 1',title:'Water'},{id:'d',course:'MOL',code:'MOL 2',title:'DNA'}],tasks=[{x:items[0],p:0,date:'2026-11-05'},{x:items[0],p:1,date:'2026-11-05'},{x:items[1],p:0,date:'2026-11-04'},{x:items[2],p:0,date:'2026-11-04',done:'2026-11-04T12:00:00Z'},{x:items[3],p:2,date:'2026-11-05'}],ctx={view:'learning',HubDomain:vm.runInNewContext(read('hub-domain.js')+';HubDomain'),DATA:{items,events:[]},AssessmentPlan:{nextByCourse:()=>[]},assessmentClock:()=>({date:'2026-11-05',minute:600}),Study:{gap:()=>0},today:()=> '2026-11-05',tasks:()=>tasks,state:{d:{skipThird:true}},lessonCourse:'all',lessonSearch:'',lessonId:'a',learningStatus:id=>({known:0,total:1,passed:mastered.has(id)}),esc:String,provisionalGuide:()=>false,title:x=>x.title,fmt:String,document:{querySelector:()=>null,getElementById:()=>null},render(){},setInterval(){}};
 vm.runInNewContext(read('assessment-planning.js'),ctx);let html=ctx.lessonCatalog();assert.match(html,/Today’s lessons · 1/);assert.match(html,/Overdue lessons · 1/);assert.match(html,/All courses · 4/);assert.equal((html.match(/data-lesson=/g)||[]).length,1);
 tasks[0].done=tasks[1].done='2026-11-05T12:00:00Z';
 html=ctx.lessonCatalog();assert.match(html,/Today’s lessons · 0/);assert.doesNotMatch(html,/data-lesson="a"/);
 tasks[1].done=undefined;
 mastered.add('a');mastered.add('b');
 html=ctx.lessonCatalog();assert.match(html,/Today’s lessons · 0/);assert.match(html,/Overdue lessons · 0/);assert.match(html,/All courses · 4/);
 ctx.lessonCourse='overdue';assert.doesNotMatch(ctx.lessonCatalog(),/data-lesson="b"/);
 mastered.clear();
 ctx.lessonCourse='overdue';html=ctx.lessonCatalog();assert.ok(html.includes('data-lesson="b"'));assert.ok(!html.includes('data-lesson="c"'));ctx.lessonSearch='Lung';html=ctx.lessonCatalog();assert.match(html,/Today’s lessons · 0/);assert.match(html,/All courses · 1/);assert.match(html,/All MOL lessons · 0/);
});
