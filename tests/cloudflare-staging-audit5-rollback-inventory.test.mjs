import test from 'node:test';
import assert from 'node:assert/strict';
import {readStaticRollbackInventory,staticRollbackInventory} from '../scripts/audit5-rollback-inventory.mjs';
const a='a'.repeat(64),b='b'.repeat(64);
test('A5-299 deduplication accounting does not merge different R2 namespaces or account privacy boundaries',()=>{
 const result=staticRollbackInventory({
  'site-assets/data':[{sha:a,size:100},{sha:a,size:100},{sha:b,size:40}],
  'publisher-packs/v1':[{sha:a,size:100}],
  'study-assets-v1':[{sha:b,size:40}]
 });
 assert.equal(result.references,5);assert.equal(result.referencedBytes,380);
 assert.equal(result.uniqueBytes,280);
 assert.equal(result.duplicateReferenceBytes,100);
 assert.equal(result.groups['site-assets/data'].duplicateBytes,100);
 assert.equal(result.groups['publisher-packs/v1'].uniqueBytes,100);
 assert.equal(result.groups['study-assets-v1'].uniqueBytes,40);
 assert.equal(result.includesPersonalBackups,false);assert.equal(result.remoteR2Verified,false);
 assert.throws(()=>staticRollbackInventory({'site-assets/data':[{sha:a,size:100},{sha:a,size:101}]}),/Conflicting/);
});
test('A5-299 generated static curriculum manifests produce a deterministic reversible size ledger',()=>{
 const first=readStaticRollbackInventory(),second=readStaticRollbackInventory();
 assert.deepEqual(first,second);
 assert.ok(first.references>100&&first.uniqueKeys>100);
 assert.ok(first.uniqueBytes>1_000_000);
 assert.ok(first.duplicateReferenceBytes>=0);
 assert.equal(first.referencedBytes-first.uniqueBytes,first.duplicateReferenceBytes);
 assert.equal(Object.keys(first.groups).length,3);
 assert.ok(Object.values(first.groups).every(v=>v.logicalBytes>=v.uniqueBytes));
 assert.equal(first.includesPersonalBackups,false);
 console.log(JSON.stringify({label:'A5-299 static academic rollback inventory proxy',references:first.references,distinctR2Keys:first.uniqueKeys,referenceBytes:first.referencedBytes,uniqueStaticBytes:first.uniqueBytes,avoidableSameNamespaceDuplicateReferencesBytes:first.duplicateReferenceBytes,personalDataTouched:false,actualRollbackArtifactMeasured:false}));
});
test('A5-299 reject malformed or untrusted entries without relying on source file names for hashes',()=>{
 const bad={sha:'not-a-digest',size:100};
 assert.throws(()=>staticRollbackInventory({'site-assets/data':[bad]}),/Invalid/);
 assert.throws(()=>staticRollbackInventory({'../escape':[]}),/Invalid/);
});
