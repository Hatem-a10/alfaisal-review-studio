// Use the original booklet headings as mappings. Never infer a lesson from the stem.
export function bookletMockQuestions(pack,course,items,withContext){
 const available=new Set(items.filter(item=>item.course===course).map(item=>item.id));
 const rows=[];
 for(const q of pack.questions){
  if(q.type!=='mcq'||!Number.isInteger(q.answer)||q.sourceIssue)continue;
  const group=String(q.group||'');
  const codes=course==='MOL'?[...group.matchAll(/^MOL\s+(\d+)\s*:/gi)].map(m=>m[1])
   :[...group.matchAll(/\b([AP]\d+)\b(?=\s*[:;&]|\s*$)/gi)].map(m=>m[1].toUpperCase());
  const mapped=[...new Set(codes.map(code=>course+'-'+code))].filter(id=>available.has(id));
  const contextual=q.contextSourceId||q.contextQuestionIds?.length?withContext(q,pack):q;
  // The exam renderer shows one figure. Complex or uncertain figure contexts remain in Booklet.
  if(contextual.figures?.length>1)continue;
  const figure=contextual.figures?.[0];
  rows.push({
   id:q.id,lectureIds:mapped.length?mapped:[course+'-Booklet'],kind:q.reviewed?'Past paper · reviewed booklet':'Past paper · booklet source key',
   source:course+' booklet',page:q.page,question:[contextual.caseText,q.question].filter(Boolean).join('\n\n'),
   ...(q.previousQuestion?{originalStem:q.previousQuestion}:{}),options:q.options,answer:q.answer,acceptedAnswers:q.acceptedAnswers,explanation:q.explanation||'',
   reasons:q.reasons?.length===q.options.length?q.reasons:q.options.map(()=>''),preserveOptionOrder:true,
   ...(figure?{image:figure.image,imageAlt:figure.alt||'Booklet question figure'}:{})
  });
 }
 return rows;
}
