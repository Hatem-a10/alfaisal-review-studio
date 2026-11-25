// Course metadata shared by workspace navigation and progress validation.
export const courses = {
 CVP: { slug: 'archive', label: 'CVP 112', lectureRanges: [['A', 23], ['P', 28]], archived: true },
 MOL: { slug: 'mol', label: 'MOL 114', lectureRanges: [['', 28]], noOspe: true, assessmentPath: 'materials/mol114/interactive-assessments.json' },
 REN: { slug: 'renal', label: 'REN 123', lectureCodes: ['A1','A2','A3','A5','A6','P1','P2','P3','P4','P5','P6','P7','P8'], unscheduled: true, assessmentPath: 'materials/ren123/interactive-assessments.json' },
};

export const lectureCourses = new Map(Object.entries(courses).flatMap(([course, config]) => {
 const codes = config.lectureCodes ?? config.lectureRanges.flatMap(([prefix, last]) =>
  Array.from({length:last}, (_, index) => prefix + (index + 1)));
 return codes.map(code => [course + '-' + code, config]);
}));
