import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../public/original-exams.js',import.meta.url),'utf8');
test('missing assessment files are not auto-retried or reloaded; transient failures are',()=>{
 assert.match(s,/response\.status===404\|\|response\.status===401\|\|response\.status===403\)throw Object\.assign\(Error\(.*?\{permanent:true\}\)/);
 assert.match(s,/assessmentLoads\.set\(course,error\?\.permanent\?'missing':'error'\);if\(!error\?\.permanent\)window\.reviewAutoRetry\?\.schedule/);
 assert.match(s,/assessmentLoads\.set\(course,'ready'\);window\.reviewAutoRetry\?\.ok\('assessments-'\+course\)/);
});
test('every course Retry button reloads its own assessments',()=>{
 assert.match(s,/if\(b\.dataset\.retryAssessments\)\{const course=b\.dataset\.retryAssessments;assessmentLoads\.delete\(course\);loadCourseAssessments\(course\)/);
 for(const course of ['REN','MOL'])assert.match(s,new RegExp('data-retry-assessments="'+course+'"'));
});
