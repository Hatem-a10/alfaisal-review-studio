import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextReleaseVersion} from '../scripts/check-release-version.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('production version advances exactly one hundredth, including major rollover',()=>{
 assert.equal(nextReleaseVersion({siteVersion:200,displayVersion:'v2.00'},'v1.99'),'v2.00');
 for(const candidate of [{siteVersion:166,displayVersion:'v1.66'},{siteVersion:168,displayVersion:'v1.68'},{siteVersion:167,displayVersion:'v1.670'}]){
  assert.throws(()=>nextReleaseVersion(candidate,'v1.66'),/Expected v1.67/);
 }
 assert.throws(()=>nextReleaseVersion({siteVersion:167,displayVersion:'v1.67'},''),/Could not verify/);
});

test('the release manifest, badge and offline cache agree',()=>{
 const release=JSON.parse(read('public/site-release.json'));
 assert.ok(read('public/index.html').includes('id="siteVersion" title="Site version '+release.siteVersion+'">'+release.displayVersion+'</span>'));
 assert.ok(read('public/phase3-cache-policy.mjs').includes("'review-studio-sw-"+release.displayVersion+"'"));
 const workflow=read('.github/workflows/production-release.yml');
 assert.ok(workflow.indexOf('node scripts/check-release-version.mjs')<workflow.indexOf('wrangler versions upload'));
 assert.match(workflow,/\[ "\$DISPLAY" = "\$SITE_VERSION" \]/);
});
