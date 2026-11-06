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
