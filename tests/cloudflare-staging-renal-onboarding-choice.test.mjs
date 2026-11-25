import test from 'node:test';
import assert from 'node:assert/strict';
import {planOnboardingWithRenalChoice} from '../public/onboarding-plan.mjs';
import {readFileSync} from 'node:fs';
const items=[{id:'REN-A1',course:'REN',title:'A1',dates:[]},{id:'REN-A2',course:'REN',title:'A2',dates:[]},{id:'MOL-1',course:'MOL',dates:['2026-11-24','2026-11-26','2026-11-28']}];
const now='2026-11-25T10:00:00Z';
const events=[{course:'REN',kind:'anatomy',title:'A1',date:'2026-11-22',end:600,studentGroups:['M1']},{course:'REN',kind:'anatomy',title:'A2',date:'2026-11-30',end:600,studentGroups:['M1']},{course:'REN',kind:'assessment',title:'REN 123 final exam',date:'2026-12-16',studentGroups:['M1']}];
const options={renalEvents:events,studentGroup:'M1',studentSection:'A',budget:180};
test('manual onboarding keeps unscheduled REN items unscheduled and preserves selected completion',()=>{
 const p=planOnboardingWithRenalChoice(items,{},now,{'REN-A1':[0]},{...options,renalChoice:'manual'});
 assert.equal(p.records['REN-A1'].done[0],'2026-11-25T10:00:00.000Z');
 assert.equal(p.records['REN-A1'].dates,undefined);
 assert.equal(p.records['REN-A2'],undefined);
 assert.equal(p.records['MOL-1'].dates.length,3);
});
test('explicit Renal scheduling uses released lessons and verified final only',()=>{
 const p=planOnboardingWithRenalChoice(items,{},now,{}, {...options,renalChoice:'schedule'});
 assert.equal(p.records['REN-A1'].dates.length,3);
 assert.ok(p.records['REN-A1'].dates.every(d=>d<'2026-12-16'));
 assert.equal(p.records['REN-A2'],undefined);
 const failed=planOnboardingWithRenalChoice(items,{},now,{}, {...options,renalEvents:[],renalChoice:'schedule'});
 assert.equal(failed.records['REN-A1'],undefined);
 assert.ok(failed.warnings.some(w=>w.id==='REN-A1'));
});
test('onboarding shows the real choice and does not save the transient form field',()=>{
 const ui=readFileSync(new URL('../public/student-profile.mjs',import.meta.url),'utf8'),entry=readFileSync(new URL('../public/profile-entry.js',import.meta.url),'utf8');
 assert.match(ui,/name="renalPlanChoice" value="manual" checked/);
 assert.match(ui,/name="renalPlanChoice" value="schedule"/);
 assert.doesNotMatch(ui,/Today’s dates are placeholders/);
 assert.match(entry,/delete p\._renalPlanChoice/);
 assert.match(entry,/planOnboardingWithRenalChoice/);
});
