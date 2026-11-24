import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/lab-core.js',import.meta.url),'utf8'),core=runInNewContext(source+';LabCore');
const at='2026-11-24T12:00:00Z',topic={id:'topic',questions:[{id:'a',answer:0,options:['x','y']},{id:'b',answer:1,options:['x','y'],visual:true}]};
const fresh={id:'fresh',topic:'topic',answers:{},submitted:false,at};
const json=v=>JSON.parse(JSON.stringify(v));
test('malformed maps and attempts cannot break practical merge; prototype keys are ignored on both sides',()=>{
 const a=JSON.parse('{"attempts":{},"notes":{"__proto__":{"at":"2026-11-24"},"constructor":{"at":"2026-11-24"}}}');
 const b={attempts:[null,{id:3},{id:'legacy',topic:'topic'}],lastView:{module:'lab'},notes:{lab:{text:'legacy'}}};
 const merged=core.merge(a,b);assert.equal(merged.attempts.length,1);assert.equal(merged.lastView.module,'lab');assert.deepEqual(Object.keys(merged.notes),['lab']);assert.equal(merged.notes.lab.text,'legacy');
 assert.equal(core.merge(null,null).attempts.length,0);
});
test('invalid keys, empty questions and malformed answers never produce a complete score',()=>{
 assert.equal(core.score([],{}).complete,false);
 assert.equal(core.score([{id:'a',answer:3,options:['x','y']}],{a:3}).correct,0);
 assert.equal(core.score([null],null).complete,false);
 assert.equal(core.score(topic.questions,null).complete,false);
 assert.deepEqual(json(core.score(topic.questions,{a:0,b:1})),{correct:2,total:2,percent:100,complete:true});
});
test('invalid or mismatched recorded mastery is not accepted as evidence',()=>{
 const base={id:'attempt',topic:'topic',kind:'mcq',total:2,correct:2,at};
 for(const attempt of [{...base,correct:3,answers:{a:0,b:1}},{...base,correct:2,answers:{a:1,b:1}},{...base,correct:'2',answers:{a:0,b:1}}])assert.equal(core.mastered({attempts:[attempt]},topic),false);
 assert.equal(core.mastered({attempts:[{...base,answers:{a:0,b:1}}]},topic),true);
 assert.equal(core.mastered({mastery:{topic:{at,visual:'yes'}}},topic),false);
 assert.equal(core.mastered({mastery:{topic:{at:'bad',visual:true}}},topic),false);
 assert.equal(core.mastered({mastery:{topic:{at,visual:true}}},topic),true);
});
test('restored drafts preserve valid choices, drop stale IDs and reset invalid submitted state',()=>{
 const draft={id:'old',topic:'topic',answers:{a:0,b:2,extra:1},submitted:true,at};
 assert.deepEqual(json(core.restoreDraft(topic,draft,fresh)),{...fresh,answers:{a:0}});
 assert.deepEqual(json(core.restoreDraft(topic,{...draft,topic:'another'},fresh)),fresh);
 assert.deepEqual(json(core.restoreDraft(topic,{...draft,answers:{a:0,b:1},submitted:true},fresh)).answers,{a:0,b:1});
 assert.equal(core.restoreDraft(topic,{...draft,submitted:false},fresh).answers.b,undefined);
});
test('stale practical form events and repeated submit cannot overwrite a different lab',()=>{
 const js=readFileSync(new URL('../public/labs.js',import.meta.url),'utf8');
 assert.match(js,/run.topic!==t.id\|\|run.submitted\)return/);
 assert.match(js,/el.dataset.labNotes===moduleId/);
 assert.match(js,/m.id===b.dataset.labModule&&m.course===course/);
 assert.match(js,/!Number.isSafeInteger\(i\)\)return/);
});
