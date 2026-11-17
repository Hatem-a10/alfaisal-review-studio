import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {selectBooklet,mergePractice} from '../public/phase2-practice-core.mjs';
const pack=JSON.parse(fs.readFileSync('public/cvp19-booklet.json')),q=id=>pack.questions.find(q=>q.id===id);
test('subject and MCQ filters default inclusive and are independent of saved completion',()=>{const s={filter:'all',booklet:{[q('cvp19-mcq-96').id]:{completed:true,correct:true,at:'2026-11-16T10:00:00Z'}}},before=structuredClone(s.booklet);assert.equal(selectBooklet(pack.questions,s).list.length,1214);s.bookletIncludeMCQ=false;assert.ok(selectBooklet(pack.questions,s).list.every(q=>q.type!=='mcq'));s.bookletDiscipline='Histology';assert.ok(selectBooklet(pack.questions,s).list.every(q=>q.discipline==='Histology'));assert.deepEqual(s.booklet,before);assert.equal(mergePractice(s,{navigationAt:'2026-11-16T12:00:00Z',bookletIncludeMCQ:false,bookletDiscipline:'Anatomy'}).booklet[q('cvp19-mcq-96').id].completed,true)});
test('linked MCQ and SAQ subparts carry their exact source figure and context',()=>{for(const [part,parent] of [[96,95],[97,95],[99,98]]){assert.equal(q('cvp19-mcq-'+part).contextSourceId,'cvp19-mcq-'+parent);assert.deepEqual(q('cvp19-mcq-'+part).figures,q('cvp19-mcq-'+parent).figures)}assert.deepEqual(q('cvp19-saq-31').figures,q('cvp19-saq-28').figures);assert.ok(q('cvp19-saq-74').caseText.includes('Munir'))});
test('five source OSPE prompts restored and wrong figure associations corrected',()=>{for(const n of [20,57,65,104,151])assert.ok(q('cvp19-ospe-'+n).question.startsWith('A)'));assert.equal(q('cvp19-ospe-56').figures[0].image,'/cvp19-figures/p299-f1.webp');assert.equal(q('cvp19-ospe-174').figures[0].image,'/cvp19-figures/p371-f1.webp')});
test('home screen and link metadata all use Review Studio',()=>{const h=fs.readFileSync('public/index.html','utf8'),m=JSON.parse(fs.readFileSync('public/manifest.webmanifest'));assert.ok(h.includes('<title>Review Studio</title>'));for(const n of ['apple-mobile-web-app-title','application-name','og:title'])assert.ok(h.includes(n+'" content="Review Studio"'));assert.equal(m.name,'Review Studio');assert.equal(m.short_name,'Review Studio')});

test('histology continuation carries its source diagram and unrelated cases never inherit an angiogram',()=>{
 for(const n of [175,176,177])assert.deepEqual(q('cvp19-saq-'+n).figures,q('cvp19-saq-174').figures);
 for(const n of [123,124,125,126,127,133,134,135,136,144,145,146,147,168,169,170,171,172,173])assert.equal(q('cvp19-saq-'+n).figures.length,0);
 assert.match(q('cvp19-saq-168').question,/SAQ21\).*62-year-old male smoker/s);assert.doesNotMatch(q('cvp19-saq-168').question,/Coarctation|Rib notching|newborn/);
 for(const n of [169,170,171,172,173]){assert.match(q('cvp19-saq-'+n).caseText,/middle lobe/);assert.doesNotMatch(q('cvp19-saq-'+n).caseText,/newborn/)}
 assert.match(q('cvp19-saq-163').question,/clinical presentation/);assert.match(q('cvp19-saq-163').sourceIssue,/does not contain/);
});

test('explicit prerequisite prompts and figures resolve safely in random order without answers or progress mutation',async()=>{
 const {withQuestionContext}=await import('../public/cvp19-booklet.mjs');const before=JSON.stringify(pack);
 const h=withQuestionContext(q('cvp19-saq-175'),pack);assert.equal(h.figures[0].image,'/cvp19-figures/p267-f0.webp');
 const reason=withQuestionContext(q('cvp19-saq-143'),pack);assert.match(reason.caseText,/where would you\s+place the stethoscope/);assert.match(reason.caseText,/position x/);assert.doesNotMatch(reason.caseText,/orange circle|second right interspace/i);
 const fixture={questions:[{id:'parent',figures:[{image:'/one.webp'}],contextSourceId:'child'},{id:'child',contextSourceId:'parent',figures:[]}]};assert.equal(withQuestionContext(fixture.questions[1],fixture).figures.length,1);
 assert.equal(JSON.stringify(pack),before);
});
