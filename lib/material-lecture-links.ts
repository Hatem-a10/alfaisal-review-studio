type UploadedMaterial = {name: string; lectureId: string};

const secondLecturePages: Record<string, number> = {17:17, 19:14, 21:9, 27:7};

export function withMaterialLectureLinks<T extends UploadedMaterial>(material: T) {
 const paired = /(?:^|_)P(16|18|20|26) and P(17|19|21|27)[_ ].*\.pdf$/i.exec(material.name);
 if (paired && Number(paired[2]) === Number(paired[1]) + 1 && material.lectureId === 'CVP-P' + paired[1]) {
  const lectureIds = paired.slice(1).map(code => 'CVP-P' + code);
  return {
   ...material,
   kind: 'Lecture slides',
   lectureIds,
   lectureRanges: [{lectureId:lectureIds[0],start:1}, {lectureId:lectureIds[1],start:secondLecturePages[paired[2]]}],
  };
 }
 if (material.lectureId === 'CVP-P28' && /Shams_P28_Control of breathing.*\.pdf$/i.test(material.name)) {
  return {...material, kind:'Lecture slides'};
 }
 return material;
}
