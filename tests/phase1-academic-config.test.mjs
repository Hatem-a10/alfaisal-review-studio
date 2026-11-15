import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {groupsFromRows,isOwner,sameOrigin,validateGroups} from '../lib/academic-config.mjs';

test('empty configuration yields only the verified default and returns a fresh copy',()=>{
 const groups=groupsFromRows([]);
 assert.equal(groups.length,8);assert.deepEqual(groups.find(g=>g.studentGroup==='M1'&&g.studentSection==='A').labGroups,['1.1','1.2','1.3','1.4','1.5','1.6']);
 groups[0].labGroups.push('fake');
 assert.ok(!groupsFromRows([])[0].labGroups.includes('fake'));
});
test('valid rows round trip and malformed storage fails closed',()=>{
 const row={class_code:'M2',group_code:'B',configuration:JSON.stringify({labGroups:['2.1','2.2']})};
 assert.deepEqual(groupsFromRows([row]),[{studentGroup:'M2',studentSection:'B',labGroups:['2.1','2.2']}]);
 for (const configuration of ['{','{}','{"labGroups":[]}','{"labGroups":["2.1"],"extra":true}']) assert.throws(()=>groupsFromRows([{...row,configuration}]));
});
test('invalid, duplicate and excessive group entries are rejected',()=>{
 const group={studentGroup:'M1',studentSection:'A',labGroups:['1.6']};
 assert.equal(validateGroups([group]),true);
 for (const value of [[],[group,group],[{...group,labGroups:['1.6','1.6']}],[{...group,studentGroup:' M1'}],[{...group,labGroups:['']}],[{...group,admin:true}],Array(101).fill(group)]) assert.equal(validateGroups(value),false);
});
test('owner requires the exact server-held digest for the authenticated identity',async()=>{
 const owner='synthetic-owner';
 const digest=createHash('sha256').update('review-studio:'+owner).digest('hex');
 assert.equal(await isOwner(owner,digest),true);
 for (const [id,key] of [['other',digest],[owner,undefined],[owner,'admin'],['',digest]]) assert.equal(await isOwner(id,key),false);
});
test('writes require an explicitly matching origin',()=>{
 const req=origin=>new Request('https://example.test/api/academic-config',{headers:origin?{origin}:{}});
 assert.equal(sameOrigin(req('https://example.test')),true);
 assert.equal(sameOrigin(req('https://evil.test')),false);
 assert.equal(sameOrigin(req()),false);
});

test('route limits its database operations to academic configuration and checks authorization before writes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const route=await readFile(new URL('../app/api/academic-config/route.ts',import.meta.url),'utf8');
 const sql=[...route.matchAll(/\.prepare\('([^']+)'\)/g)].map(match=>match[1]);
 assert.equal(sql.length,3);
 assert.ok(sql.every(statement=>/\breview_academic_groups\b/.test(statement)));
 assert.ok(route.indexOf('if (!sameOrigin(request))')<route.indexOf('await env.DB.batch('));
 assert.ok(route.indexOf('if (!await isOwner(id,ownerKey))')<route.indexOf('await env.DB.batch('));
 assert.doesNotMatch(route,/adminPhrase|admin[_-]phrase/i);
});
