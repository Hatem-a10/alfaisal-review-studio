import test from 'node:test';import assert from 'node:assert/strict';import {OspeCore} from '../public/ospe-core.mjs';
const stations=[{id:'a',parts:[{marks:2},{marks:1},{marks:1}]},{id:'b',parts:[{marks:1}]}];
test('missed rubric includes explicitly self-marked partial and zero marks only after review',()=>{
 const run={slots:[{station:'a'},{rest:true},{station:'b'}],marks:{a:{0:1,1:1},b:{0:0}},answers:{a:{0:'partial'},b:{0:'wrong'}}};
 assert.deepEqual(OspeCore.missedParts(run,stations),[]);
 assert.deepEqual(OspeCore.missedParts({...run,finished:true},stations),[{stationId:'a',index:0,earned:1,possible:2,response:'partial'},{stationId:'b',index:0,earned:0,possible:1,response:'wrong'}]);
 assert.deepEqual(OspeCore.missedParts({...run,selfAssessed:true,stationIds:['a','a','missing']},stations),[{stationId:'a',index:0,earned:1,possible:2,response:'partial'}]);
});