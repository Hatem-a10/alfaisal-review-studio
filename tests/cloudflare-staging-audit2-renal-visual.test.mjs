import test from 'node:test';
import assert from 'node:assert/strict';
import {renalLessons,renalTeachingPack,validateRenalLessons} from '../public/renal-lessons.mjs';
import {relatedHistologyStations} from '../public/renal-histology-practice.mjs';
import {courses} from '../public/course-registry.mjs';
test('registered Renal lectures assemble with five distinct core questions per topic',()=>{
 const pack=renalTeachingPack();assert.deepEqual(pack.items.map(x=>x.code),courses.REN.lectureCodes);
 assert.ok(pack.questions.length>=125);
 for(const g of Object.values(pack.guides))for(const t of g.sections)assert.ok(pack.questions.filter(q=>q.concept===t.id).length>=5);
});
test('missing or incomplete Renal teaching is an explicit validation error',()=>{
 assert.throws(()=>validateRenalLessons(renalLessons.slice(1)),/Missing registered REN lesson/);
 const entries=structuredClone(renalLessons);entries[0].topics[0].pages=[];
 assert.throws(()=>validateRenalLessons(entries),/incomplete or duplicate topic/);
});
test('only existing histology stations appear; kidney microstructure matches rank first',()=>{
 const f={width:100,height:100,image:'data:image/png;base64,AA=='};
 const station=(id,category,answer)=>({id,category,page:250,figures:[f],parts:[{prompt:'Identify the structure',answer}]});
 const result=relatedHistologyStations({stations:[station('other','histology','Urothelium'),station('kidney','histology','Glomerulus'),station('anatomy','dry','Glomerulus')]});
 assert.deepEqual(result.map(s=>[s.id,s.relatedA5]),[['kidney',true],['other',false]]);
 assert.equal(result[0].figures[0],f);
});
