'use strict';
applyLessonDepth(LEARNING, TEACHING, TOPIC_CHECKS, DIAGRAMS, LESSON_DEPTH);
// These revised stems preserve the existing correct-option indices and question IDs.
for (const question of LEARNING.questions) {
 if (question.id === 'drill-CVP-A6-0-0') {
  question.objectiveId = 'CVP-A6:expanded-0';
  question.question = 'An angiography catheter is positioned at the aortic root. From which structures do the right and left coronary arteries arise?';
  question.options = ['Right and left aortic sinuses', 'The pulmonary trunk', 'The coronary sinus'];
  question.reasons = ['The coronary ostia open in the corresponding aortic sinuses.', 'The pulmonary trunk carries blood from the right ventricle to the lungs.', 'The coronary sinus collects cardiac venous blood and empties into the right atrium.'];
 } else if (question.id === 'drill-CVP-A6-2-0') {
  question.objectiveId = 'CVP-A6:w2-2';
  question.question = 'A tracer injected into the coronary sinus is carried into which chamber first?';
  question.options = ['Right atrium', 'Left atrium', 'Left ventricle'];
  question.reasons = ['The coronary sinus opens into the right atrium.', 'Pulmonary veins empty into the left atrium.', 'The left ventricle receives blood from the left atrium across the mitral valve.'];
 } else continue;
 question.explanation = question.reasons[question.answer];
}
inlineLessonCache.clear();

// Slide-based walkthroughs for the existing Week 2 objectives.
for (const [id, source, pages, teaching] of [
 ['CVP-A7:expanded-1', 'cvp-w2-slides-7', [13, 17, 18, 20, 21],
  'On an unknown section, start with the media. Many wavy elastic sheets throughout the media favor an elastic artery. An internal elastic lamina and a prominent muscle-rich media favor a muscular artery. In the lecture examples, the ulnar artery has conspicuous internal and external elastic boundaries, the digital artery has the internal boundary, and the illustrated arteriole has only a few muscle layers. Use the whole wall pattern before relying on one boundary or on lumen shape.'],
 ['CVP-A8:expanded-2', 'cvp-w2-slides-8', [9, 11, 12, 13],
  'Trace lymph separately from the intercostal veins. The thoracic duct starts at the cisterna chyli, enters the thorax via the aortic opening, and ends at the left venous angle. It returns lymph from below the diaphragm and the left upper quadrant. Lymph from the right upper quadrant returns via the right lymphatic duct to the right venous angle. Each venous angle is the junction of the internal jugular and subclavian veins.'],
 ['CVP-P6:expanded-3', 'cvp-w2-slides-0', [19, 20, 21],
  'Read a cardiac-cycle graph by finding pressure crossings first. Rising ventricular pressure crosses atrial pressure and closes the AV valve. The next crossing, above arterial pressure, opens the semilunar valve. During relaxation the crossings occur in reverse: below arterial pressure closes the semilunar valve, then below atrial pressure opens the AV valve. Between each pair of crossings both valves are closed, so ventricular volume stays flat even though pressure changes.'],
 ['CVP-P8:expanded-1', 'cvp-w2-slides-4', [13, 14, 18],
  'Compare pressure gradients before comparing flows. If two beds have equal resistance and both receive blood at 90 mmHg, an outlet pressure of 15 mmHg leaves a 75 mmHg driving gradient, while an outlet pressure of 5 mmHg leaves 85 mmHg. At equal resistance, the second bed carries 85/75, or about 13% more flow. Equal inlet pressures alone tell you neither gradient nor flow.'],
 ['CVP-P9:expanded-0', 'cvp-w2-slides-6', [5, 6, 14, 15],
  'Separate a local response from a whole-circulation prediction. At unchanged perfusion pressure, dilation of arterioles in an active tissue increases flow through that tissue. If several beds dilate, total peripheral resistance falls. With cardiac output held fixed, this lowers mean arterial pressure. The fixed-output assumption matters because compensatory changes in cardiac output can alter the observed result.'],
 ['CVP-P10:expanded-3', 'cvp-w2-slides-5', [21, 23, 24],
  'Compare the upstream chambers. In aortic stenosis the left ventricle generates extra systolic pressure to drive blood through a narrow outlet. In mitral stenosis the left atrium needs a higher pressure to fill the ventricle across a narrow inlet. A faster heart rate shortens filling time, which makes it harder to maintain forward flow across the stenotic mitral valve and can raise pressure upstream toward the lungs.'],
]) {
 const lectureId = id.split(':')[0];
 const section = TEACHING.guides[lectureId]?.sections.find(entry => entry.id === id);
 if (!section || section.body.includes(teaching)) continue;
 section.body.push(teaching);
 section.references ??= [];
 for (const page of pages) {
  if (!section.references.some(ref => ref.source === source && ref.page === page)) section.references.push({source, page});
 }
}
