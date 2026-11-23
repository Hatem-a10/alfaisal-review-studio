import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {assembledLearning} from './assembled-learning.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const json=path=>JSON.parse(read(path));
const reportFolder='docs/content-audits/';
const origin='https://alfaisal.review';
const unique=values=>[...new Set(values)];
const text=value=>typeof value==='string'&&value.trim().length>0;
const applicationPattern=/application|reasoning|calculation|clinical interpretation|measurement|graph interpretation/i;
const visualPattern=/image|figure|graph|trace|micrograph|diagram|specimen|radiograph|histologic section/i;

class Inventory {
 constructor(learning){
  this.sources=new Map(learning.sources.map(s=>[s.id,{...s,pageSet:new Set(s.pages?.map(p=>p.page))}]));
  this.paths=new Set([
   ...this.registry('lib/site-assets-manifest.ts').map(x=>'/'+x.path),
   ...this.registry('lib/study-asset-registry.ts').map(x=>'/api/study-assets/'+x.id),
   ...json('lib/private-media-manifest.json').map(x=>'/'+x.path),
  ]);
 }
 registry(path){
  const raw=read(path).split(' = ')[1];
  return JSON.parse(raw.slice(0,raw.lastIndexOf(']')+1));
 }
 validRef(ref){
  const src=this.sources.get(ref?.source);
  return Number.isInteger(ref?.page)&&ref.page>0&&src?.pageSet.has(ref.page)&&
   (ref.endPage==null||(Number.isInteger(ref.endPage)&&ref.endPage>=ref.page&&src.pageSet.has(ref.endPage)));
 }
 asset(input){
  if(!text(input))return 'missing-path';
  let url;try{url=new URL(input,origin)}catch{return 'invalid-path'}
  if(url.origin!==origin)return url.protocol==='https:'?'external-unverified':'invalid-path';
  let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{return 'invalid-path'}
  if(pathname.startsWith('/api/site-assets/'))pathname=pathname.slice('/api/site-assets'.length);
  if(this.paths.has(pathname))return 'registered';
  return existsSync(new URL('public'+pathname,root))?'local':'missing-from-repository-and-registry';
 }
}

const questionImage=q=>[q.image,q.promptImage,q.figure?.image,q.figure,q.imageUrl].find(text);
const normalize=(value='')=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const identity=q=>normalize(q.question)+'|'+(questionImage(q)||'');
function distinct(questions){
 const ids=new Set(), stems=new Set(), items=[], duplicates=[];
 for(const q of questions){
  const stem=identity(q);
  if(q.duplicateOf||ids.has(q.id)||stems.has(stem)){duplicates.push(q.id);continue}
  ids.add(q.id);stems.add(stem);items.push(q);
 }
 return {items,duplicates};
}
const isVisualQuestion=q=>visualPattern.test([q.kind,q.sourceType,q.difficulty].filter(text).join(' '))||!!questionImage(q)&&visualPattern.test(q.question);
function questionIssues(q){
 const issues=[];
 if(!text(q.id)||!text(q.question))issues.push('missing-id-or-stem');
 if(!Array.isArray(q.options)||q.options.length<4||!q.options.every(text)){
  issues.push('invalid-choice-set');
 }else if(new Set(q.options.map(choice=>choice.normalize('NFKC').trim().toLowerCase())).size!==q.options.length){
  issues.push('duplicate-choices');
 }
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=(q.options?.length||0))issues.push('invalid-key-index');
 return issues;
}
const graded=q=>questionIssues(q).length===0;
const feedback=q=>text(q.explanation)&&q.reasons?.length===q.options?.length&&q.reasons.every(text);
function subject(item){
 if(item.course==='MOL')return 'Molecular Medicine';
 if(item.id.startsWith('CVP-P'))return 'Physiology';
 if(/histology/i.test(item.title))return 'Histology';
 if(/embryology|development|formation of heart/i.test(item.title))return 'Embryology';
 return 'Anatomy';
}
function figureRefs(refs,diagrams){
 return refs.flatMap(r=>diagrams[r.source+':'+r.page]||[]);
}
function figureEntry(figure,inventory){
 return {path:figure.image||null,source:figure.source||null,page:figure.page||null,availability:inventory.asset(figure.image),validLocator:!!inventory.validRef(figure)};
}
function auditQuestions(questions,inventory){
 const {items,duplicates}=distinct(questions);
 const valid=items.filter(graded);
 const tagged=q=>[q.kind,q.sourceType,q.difficulty].filter(text).join(' ');
 return {
  distinct:valid.length,
  application:valid.filter(q=>applicationPattern.test(tagged(q))).length,
  visualInterpretation:valid.filter(isVisualQuestion).length,
  mediumReasoning:valid.filter(q=>/^(medium|intermediate)$/i.test(q.difficulty||'')&&applicationPattern.test(tagged(q))).length,
  missingDifficulty:valid.filter(q=>!text(q.difficulty)).map(q=>q.id),
  invalidMcqs:items.map(q=>({id:q.id,issues:questionIssues(q)})).filter(q=>q.issues.length),
  missingExplanations:valid.filter(q=>!feedback(q)).map(q=>q.id),
  missingCitations:valid.filter(q=>!q.references?.length).map(q=>q.id),
  invalidCitations:items.flatMap(q=>(q.references||[]).filter(r=>!inventory.validRef(r)).map(r=>({id:q.id,...r}))),
  duplicateCandidates:unique(duplicates),
  questionImages:valid.filter(questionImage).map(q=>({id:q.id,path:questionImage(q),availability:inventory.asset(questionImage(q))})),
  provenanceLabels:Object.fromEntries([...new Set(valid.map(q=>q.provenance||q.sourceType||q.kind||'unclassified'))].sort().map(label=>[label,valid.filter(q=>(q.provenance||q.sourceType||q.kind||'unclassified')===label).length])),
 };
}
const nonContent=new Set('the and are for with from how explain describe identify compare distinguish understand define relate outline list discuss predict recognize know review different role using'.split(' '));
function candidates(objective,topics){
 const words=unique(normalize(objective).split(' ').filter(w=>w.length>=4&&!nonContent.has(w)));
 return topics.map(t=>{
  const tokens=new Set(normalize([t.title,...(t.body||t.paragraphs||[])].join(' ')).split(' '));
  return {id:t.id,matched:words.filter(word=>tokens.has(word)).length};
 }).filter(t=>t.matched>=2).sort((a,b)=>b.matched-a.matched).slice(0,3).map(t=>t.id);
}

export function lectureAudit(){
 const config=json(reportFolder+'lecture-quality-targets.json');
 assert.equal(config.schemaVersion,1);
 const {learning,teaching,checks,diagrams}=assembledLearning();
 const catalog=runInNewContext(read('public/data.js')+';DATA.items');
 const numbered=catalog.filter(x=>/^(?:CVP-[AP]|MOL-)\d+$/.test(x.id));
 assert.equal(new Set(numbered.map(l=>l.id)).size,numbered.length,'duplicate numbered lecture ID');
 for(const id of Object.keys(config.lectures))assert.ok(numbered.some(l=>l.id===id),'unknown lecture target '+id);
 const {group}=runInNewContext(read('public/inline-topics.js').split('let inlineLessonCache')[0]+';InlineTopics');
 // Use the same source classifier as Material Library. Links are evaluated separately.
 const {libraryMaterials}=runInNewContext(read('public/library-list.js')+';({libraryMaterials})');
 const inventory=new Inventory(learning);
 const mol=runInNewContext(read('public/mol-metabolism-data.js')+';MOL_METABOLISM');
 const discoveredQuestions=learning.questions.concat(Object.values(checks).flat());
 const byId=new Map(), conflictingIds=new Set();
 for(const q of discoveredQuestions){
  const prior=byId.get(q.id);
  if(prior&&normalize(prior.question)!==normalize(q.question))conflictingIds.add(q.id);
  if(!prior)byId.set(q.id,q);
 }
 const coreById=new Map([...Object.values(checks).flat(),...learning.questions].map(q=>[q.id,q]));
 return {
  schemaVersion:1,
  scope:'Repository-backed numbered lectures and the assembled inline teaching bank. Private uploads and exam-only generators are excluded. Asset registry matches are not remote download verification.',
  globalIssues:{
   conflictingQuestionIds:[...conflictingIds].sort(),
   duplicateCatalogSourceIds:unique(learning.sources.map(s=>s.id).filter((id,i,ids)=>ids.indexOf(id)!==i)),
   questionMappingsOutsideCatalog:[...byId.values()].filter(q=>q.lectureIds?.some(id=>!numbered.some(l=>l.id===id))).map(q=>q.id),
  },
  lectures:numbered.map(item=>{
   const l=learning.lessons.find(v=>v.id===item.id)||{facts:[],references:[]};
   const guide=teaching.guides[item.id]||{};
   const topics=guide.sections?.length?guide.sections:l.facts.map(f=>({id:f.id,title:f.concept,body:[f.answer,f.teach],references:f.references||l.references}));
   const discipline=subject(item);
   const override=config.lectures[item.id]||{};
   const targets={...config.defaults,...config.subjects[discipline],...override};
   const min=targets.questionsPerMajorTopic.min,aim=targets.questionsPerMajorTopic.aim;
   assert.ok(Number.isInteger(min)&&min>=2&&Number.isInteger(aim)&&aim>=min,item.id);
   const bank=[...byId.values()].filter(q=>q.lectureIds?.includes(item.id)).map(q=>q.objectiveByLecture?.[item.id]?{...q,objectiveId:q.objectiveByLecture[item.id]}:q);
   const grouped=group(topics,bank,checks);
   const coreBank=[...coreById.values()].filter(q=>q.lectureIds?.includes(item.id)&&q.id!=='CVP-P14:w3-renal-signals-q2').map(q=>q.objectiveByLecture?.[item.id]?{...q,objectiveId:q.objectiveByLecture[item.id]}:q);
   const coreGrouped=group(topics,coreBank,checks);
   for(const id of targets.visualTopics||[])assert.ok(topics.some(t=>t.id===id),'unknown visual topic '+id);
   const questions=auditQuestions(bank,inventory);
   const assigned=new Set(grouped.flat().map(q=>q.id));
   const slots=topics.map((topic,index)=>{
    const refs=topic.references||[];
    const candidates=figureRefs(refs,diagrams);
    const fallback=refs.find(r=>diagrams[r.source+':'+r.page]);
    const initial=topic.figure||fallback;
    const figure=initial?.image?[initial]:figureRefs(initial?[initial]:[],diagrams);
    // These three render wrappers can add the referenced crops in a details gallery.
    const gallery=topic.id?.includes(':w3-')||topic.id?.includes(':pulm-')||!!mol.guides[item.id];
    const figures=[...new Map([...figure,...(gallery?candidates:[])].map(f=>[f.image,f])).values()].map(f=>figureEntry(f,inventory));
    const topicQuestions=distinct(grouped[index]).items.filter(graded);
    return {
     id:topic.id,title:topic.title,
     teaching:(topic.body||topic.paragraphs||[]).some(text),
     takeaway:!!topic.keyPoints?.some(text),
     traps:!!topic.pitfalls?.some(text),
     sourceCount:refs.length,
     validCitations:refs.filter(r=>inventory.validRef(r)).length,
     invalidCitations:refs.filter(r=>!inventory.validRef(r)),
     distinctMcqs:topicQuestions.length,
     visualInterpretationMcqs:topicQuestions.filter(isVisualQuestion).length,
     distinctCoreStems:new Set(coreGrouped[index].filter(q=>!q.duplicateOf).map(q=>q.question.toLowerCase().replace(/[^\p{L}\p{N}]/gu,''))).size,
     targetMinimum:min,
     mappedFigures:figures,
     configuredVisualRequirement:targets.visualTopics?.includes(topic.id)===true,
    };
   });
   const reportedObjectives=(guide.objectives||[]).map((objective,index)=>{
    const reviewed=override.objectiveTopics?.[index+1]||[];
    for(const id of reviewed)assert.ok(slots.some(t=>t.id===id&&t.teaching),'invalid reviewed objective mapping '+id);
    return {number:index+1,text:objective,reviewedTopicIds:reviewed,candidateTopicIds:candidates(objective,topics)};
   });
   const lessonRefs=l.references||[];
   const selection=libraryMaterials(item,l,learning.sources);
   const materials=Object.fromEntries(Object.entries(selection).map(([type,entries])=>[type,entries.map(({source,page})=>{
    const part=source.parts?.find(p=>page>=p.start&&page<=p.end);
    const url=part?.url||source.url;
    const downloadable=text(url)&&!url.startsWith('#')&&(/\.(pdf|pptx?)(?:[?#]|$)/i.test(url)||/\.(pdf|pptx?)$/i.test(source.name));
    return {source:source.id,start:page,availability:downloadable?inventory.asset(url):'indexed-text-only'};
   })]));
   const availableFigures=[...new Map([...figureRefs([...lessonRefs,...topics.flatMap(t=>t.references||[])],diagrams),...topics.map(t=>t.figure).filter(f=>f?.image)].map(f=>[f.image,f])).values()].map(f=>figureEntry(f,inventory));
   const displayed=unique(slots.flatMap(t=>t.mappedFigures.map(f=>f.path)));
   const gaps=[];
   if(!reportedObjectives.length)gaps.push('missing-objective-list');
   if(reportedObjectives.some(o=>!o.reviewedTopicIds.length))gaps.push('objective-map-needs-editor');
   if(!slots.length||slots.some(t=>!t.teaching))gaps.push('missing-teaching');
   if(slots.some(t=>t.distinctMcqs<min))gaps.push('under-target-practice');
   if(slots.some(t=>t.distinctCoreStems<targets.requiredDistinctCorePerTopic))gaps.push('existing-core-floor');
   if(questions.application<targets.applicationQuestionsPerLecture)gaps.push('application-coverage');
   if(questions.mediumReasoning<targets.mediumReasoningQuestionsPerLecture)gaps.push('difficulty-review');
   if(lessonRefs.some(r=>!inventory.validRef(r))||slots.some(t=>!t.sourceCount||t.invalidCitations.length)||questions.invalidCitations.length||questions.missingCitations.length)gaps.push('citation-review');
   if(slots.some(t=>!t.takeaway)||targets.requireGuidedSummary&&!guide.summary?.some(text))gaps.push('revision-summary');
   if(questions.invalidMcqs.length||questions.missingExplanations.length)gaps.push('question-integrity');
   if(availableFigures.some(f=>f.availability.startsWith('missing')||!f.validLocator)||questions.questionImages.some(f=>f.availability.startsWith('missing'))||slots.some(t=>t.configuredVisualRequirement&&t.mappedFigures.filter(f=>['local','registered'].includes(f.availability)).length<targets.figuresPerConfiguredVisualTopic))gaps.push('figure-review');
   if(slots.some(t=>t.configuredVisualRequirement&&t.visualInterpretationMcqs<targets.visualQuestionsPerConfiguredVisualTopic))gaps.push('visual-practice-review');
   if(Object.values(materials).some(entries=>!entries.some(e=>['local','registered','external-unverified'].includes(e.availability))))gaps.push('source-document-availability');
   return {
    id:item.id,title:item.title,subject:discipline,targets,
    objectiveCount:reportedObjectives.length,objectivesWithReviewedTeaching:reportedObjectives.filter(o=>o.reviewedTopicIds.length).length,
    objectivesWithCandidateTeaching:reportedObjectives.filter(o=>o.candidateTopicIds.length).length,objectives:reportedObjectives,
    topicsWithTeaching:slots.filter(t=>t.teaching).length,topicsBelowMinimum:slots.filter(t=>t.distinctMcqs<min).map(t=>t.id),topics:slots,
    citedTopics:slots.filter(t=>t.validCitations>0).length,
    invalidLectureCitations:lessonRefs.filter(r=>!inventory.validRef(r)),
    questions:{...questions,unassignedToInlineTopic:bank.filter(q=>graded(q)&&!assigned.has(q.id)).map(q=>q.id)},
    availableFigures,rendererMappedFigureCount:displayed.length,materials,gaps,
    meetsExistingCoreFloor:!gaps.includes('existing-core-floor'),
    editorialStatus:'editorial-review-pending',
   };
  }),
 };
}

function markdown(report){
 const lectures=report.lectures;
 const counts=Object.fromEntries(unique(lectures.flatMap(l=>l.gaps)).sort().map(g=>[g,lectures.filter(l=>l.gaps.includes(g)).length]));
 const ranked=[...lectures].sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id));
 function priority(l){return (l.gaps.includes('missing-teaching')?100:0)+(l.gaps.includes('figure-review')?30:0)+l.topicsBelowMinimum.length*3+(l.gaps.includes('question-integrity')?10:0)+(l.gaps.includes('citation-review')?5:0)+(l.gaps.includes('source-document-availability')?2:0)}
 const cell=v=>String(v).replaceAll('|','\\|').replaceAll('\n',' ');
 const files=l=>l.filter(x=>['registered','local','external-unverified'].includes(x.availability)).length;
 const table=['| Lecture | Subject | Objectives / candidate links | Taught / total topics | Distinct MCQs / application / visual | Topics below minimum | Figures mapped / available | Topics cited | Slides / transcripts | Editorial status |','| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',...lectures.map(l=>`| ${l.id} ${cell(l.title)} | ${l.subject} | ${l.objectiveCount} / ${l.objectivesWithCandidateTeaching} | ${l.topicsWithTeaching} / ${l.topics.length} | ${l.questions.distinct} / ${l.questions.application} / ${l.questions.visualInterpretation} | ${l.topicsBelowMinimum.length} (min ${l.targets.questionsPerMajorTopic.min}) | ${l.rendererMappedFigureCount} / ${l.availableFigures.length} | ${l.citedTopics} | ${files(l.materials.slides)} / ${files(l.materials.transcript)} | Pending |`)];
 return ['# Numbered lecture coverage audit','',`${lectures.length} lectures. Machine inventory for editorial review. [Per-lecture targets](lecture-quality-targets.json) and [complete findings](lecture-coverage.json).`,'',
  '- Counts use assembled repository data and the same inline topic grouping as Learn & Master. Graded MCQs in the audit require four meaningful text choices structurally, a usable key and a canonical or deduplicated stem. Duplicate candidates are leads for review.',
  '- Objective links are lexical candidates. An editor must confirm the teaching against each objective. Titles, topic presence, question tags and figure labels do not verify accuracy or completeness.',
  '- Application and visual counts use existing metadata and clear image-dependent stems. Medium difficulty needs a tag. The renderer-mapped figure count includes the referenced galleries the course renderers add. It is a source-level estimate. Device rendering and private file reachability need authorized browser checks.',
  '- Slides and transcripts count mapped documents with a registered, local or external path. Extracted reading and unregistered entries remain in the JSON. Prior mock-pool coverage is a separate [audit](../phase2-practice-audit.md).',
  `- ${lectures.filter(l=>l.meetsExistingCoreFloor).length} lectures meet the existing five-distinct-core-stems rule. ${lectures.filter(l=>!l.gaps.length).length} have no remaining machine flags. Every lecture is pending editorial review. This audit changed no student-facing content.`,
  `- ${lectures.reduce((sum,l)=>sum+l.questions.duplicateCandidates.length,0)} duplicate candidate placements and ${lectures.reduce((sum,l)=>sum+l.questions.unassignedToInlineTopic.length,0)} unassigned question placements are recorded in the JSON. Cross-lecture placements are counted separately.`,'',
  '## Priority queue','',
  ...ranked.filter(l=>priority(l)>0).slice(0,12).map(l=>`- **${l.id} ${l.title}** has ${l.topicsBelowMinimum.length} under-target topics and these flags: ${l.gaps.join(', ')}.`),'',
  'Triage unauthorized or unavailable assets and invalid keys/citations before expansion. Then address genuinely uncovered teaching, missing application and visual tasks. Validate lexical matches and add justified lecture-specific goals against the original sources.','',
  '## Gap counts','',
  ...Object.entries(counts).map(([k,v])=>`- ${k}: ${v} lectures`),'','## Lecture inventory','',...table,'',
  'Regenerate with `node scripts/audit-lecture-quality.mjs --write`. Check reproducibility with `node scripts/audit-lecture-quality.mjs --check`.',''].join('\n');
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const mode=process.argv[2];
 const report=lectureAudit();
 const outputs={'lecture-coverage.json':JSON.stringify(report,null,2)+'\n','lecture-coverage.md':markdown(report)};
 for(const [name,body] of Object.entries(outputs)){
  const path=reportFolder+name;
  if(mode==='--write')writeFileSync(new URL(path,root),body);
  if(mode==='--check')assert.equal(read(path),body,'stale audit '+name);
 }
 console.log(`Audited ${report.lectures.length} lectures and ${report.lectures.reduce((n,l)=>n+l.topics.length,0)} teaching topics.`);
}
