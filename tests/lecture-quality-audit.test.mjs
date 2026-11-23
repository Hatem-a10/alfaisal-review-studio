import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const root=new URL('../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('docs/content-audits/lecture-coverage.json',root)));

test('lecture coverage audit is reproducible and inventories all numbered lectures',()=>{
 assert.match(execFileSync(process.execPath,['scripts/audit-lecture-quality.mjs','--check'],{cwd:root,encoding:'utf8'}),/Audited 79 lectures/);
 assert.equal(data.lectures.length,79);
 assert.equal(new Set(data.lectures.map(lecture=>lecture.id)).size,79);
 for(const ids of Object.values(data.globalIssues))assert.deepEqual(ids,[]);
});

test('editorial targets preserve the core practice floor and use valid configured topic mappings',()=>{
 for(const lecture of data.lectures){
  assert.ok(lecture.meetsExistingCoreFloor,lecture.id);
  assert.equal(lecture.targets.requiredDistinctCorePerTopic,5);
  assert.ok(lecture.topics.every(topic=>topic.distinctCoreStems>=5),lecture.id);
  for(const id of lecture.targets.visualTopics||[]){
   assert.ok(lecture.topics.some(topic=>topic.id===id&&topic.configuredVisualRequirement),id);
  }
 }
 for(const id of ['CVP-A10','CVP-A11','CVP-A12','CVP-A13']){
  const lecture=data.lectures.find(lecture=>lecture.id===id);
  assert.equal(lecture.targets.questionsPerMajorTopic.min,5);
  assert.deepEqual(lecture.topicsBelowMinimum,[]);
 }
});
