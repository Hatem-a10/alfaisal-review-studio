import verifiedSections from './cvp-section-defaults.json';

export const classes = ['M1','M2','F1','F2'];
export const plans = ['gradual','upcoming','later'];

export type SharedDocument = {title:string;kind:"slides"|"transcript"|"other"} &
 ({path:string;uploadId?:never}|{uploadId:string;path?:never});
export type Lecture = {id:string; title:string; course:string; availableOn?:string; reviewsOn?:[string,string,string]; documents?:SharedDocument[]};
export type AcademicEvent = {title:string; date:string; time?:string; end?:string; labStream?:LabStream; labGroups?:string[]; kind:"class"|"exam"|"tbl"|"break"|"practical"};
export type LabStream = "A"|"B";
export type Group = {classCode:string; groupCode:string; lectures:Lecture[]; events?:AcademicEvent[]; tblGroups?:string[]; labGroups?:Record<LabStream,string[]>};
export type EnglishSchedule = {pattern:"mon-wed"|"sun-tue-thu"; start:string; end:string};
export type StudentProfile = {
 step:number; name:string; classCode:string; groupCode:string; theme:string;
 accent:string; reviews:Record<string,number[]>; plan:string; analytics:boolean; english?:EnglishSchedule; tblGroup?:string; labStream?:LabStream; labGroup?:string;
};

const label = (value:unknown, max:number): value is string =>
 typeof value === 'string' && value.trim().length > 0 && value === value.trim() && value.length <= max;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const labCode = /^[12]\.(?:[1-9]|1[0-2])$/;
const lectureId = /^(?:CVP-(?:A(?:[1-9]|1\d|2[0-3])|P(?:[1-9]|1\d|2[0-8]))|MOL-(?:[1-9]|1\d|2[0-8]))$/;

function validDate(value:unknown): value is string {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const date = new Date(value);
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

function validDocument(doc:any): doc is SharedDocument {
 if (!label(doc?.title,180) || !['slides','transcript','other'].includes(doc.kind)) return false;
 if (typeof doc.path==='string' && doc.uploadId===undefined)
  return /^materials\/[a-z0-9][a-z0-9._-]{0,160}\.(?:pdf|pptx|ppt|docx)$/i.test(doc.path);
 return doc.path===undefined && typeof doc.uploadId==='string' && /^[\w-]{1,80}$/.test(doc.uploadId);
}

export function validEvent(event:any): event is AcademicEvent {
 return label(event?.title,160) && validDate(event.date) && ['class','exam','tbl','break','practical'].includes(event.kind) &&
  (event.time === undefined || (typeof event.time === 'string' && timePattern.test(event.time))) &&
  (event.end === undefined || (typeof event.end==='string' && timePattern.test(event.end) && event.time && event.time<event.end)) &&
  (event.labStream===undefined || ['A','B'].includes(event.labStream)) &&
  (event.labGroups===undefined || (event.labStream && Array.isArray(event.labGroups) &&
   event.labGroups.length<=12 && event.labGroups.every((code:unknown)=>typeof code==='string'&&labCode.test(code))));
}

export function validGroup(group:any): group is Group {
 return classes.includes(group?.classCode) && label(group.groupCode,60) &&
  Array.isArray(group.lectures) && group.lectures.length <= 79 &&
  group.lectures.every((lecture:any) => lectureId.test(lecture?.id) && label(lecture.title,180) && label(lecture.course,60) &&
   (lecture.availableOn===undefined || validDate(lecture.availableOn)) &&
   (lecture.documents===undefined || (Array.isArray(lecture.documents) && lecture.documents.length<=12 && lecture.documents.every(validDocument))) &&
   (lecture.reviewsOn===undefined || (Array.isArray(lecture.reviewsOn) && lecture.reviewsOn.length===3 &&
    lecture.reviewsOn.every(validDate) && lecture.reviewsOn[0]<lecture.reviewsOn[1] && lecture.reviewsOn[1]<lecture.reviewsOn[2]))) &&
  (group.events===undefined || (Array.isArray(group.events) && group.events.length<=500 && group.events.every(validEvent))) &&
  (group.tblGroups===undefined || (Array.isArray(group.tblGroups) && group.tblGroups.length<=40 &&
   group.tblGroups.every((code:unknown)=>typeof code==='string' && /^[MF](?:[1-9]|[12]\d|3[0-7])$/.test(code) && code[0]===group.classCode[0]) &&
   new Set(group.tblGroups).size===group.tblGroups.length)) &&
  (group.labGroups===undefined || (group.labGroups && ['A','B'].every(stream=>
   Array.isArray(group.labGroups[stream]) && group.labGroups[stream].length<=12 &&
   group.labGroups[stream].every((code:unknown)=>typeof code==='string'&&labCode.test(code))))) &&
  new Set(group.lectures.map((lecture:Lecture) => lecture.id)).size === group.lectures.length;
}

export function cleanProfile(input:any, groups:Group[], finish:boolean): StudentProfile | null {
 if (!input || !Number.isInteger(input.step) || input.step < 1 || input.step > 6 ||
     typeof input.name !== 'string' || input.name.length > 80 ||
     !['light','dark','amoled'].includes(input.theme) || !/^#[0-9a-f]{6}$/i.test(input.accent) ||
     !plans.includes(input.plan) || typeof input.analytics !== 'boolean' ||
     !input.reviews || typeof input.reviews !== 'object' || Array.isArray(input.reviews)) return null;
 const english = input.english;
 if (english !== undefined && (!english || !['mon-wed','sun-tue-thu'].includes(english.pattern) ||
   typeof english.start!=='string' || typeof english.end!=='string' ||
   !timePattern.test(english.start) || !timePattern.test(english.end) || english.start>=english.end)) return null;
 const group = groups.find(row => row.classCode === input.classCode && row.groupCode === input.groupCode);
 if (finish && (!input.name.trim() || !group)) return null;
 const tblGroup=group?.tblGroups?.find(code=>code===input.tblGroup);
 if (input.tblGroup && !tblGroup) return null;
 if (finish && group?.tblGroups?.length && !tblGroup) return null;
 const labStream:LabStream|undefined=input.labStream==='A'||input.labStream==='B'?input.labStream:undefined;
 const labGroup=labStream?group?.labGroups?.[labStream]?.find(code=>code===input.labGroup):undefined;
 if ((input.labStream && (!labStream||!group?.labGroups)) || (input.labGroup&&!labGroup)) return null;
 const allowed = new Set(group?.lectures.map(lecture => lecture.id));
 const reviews:Record<string,number[]> = {};
 for (const [id, passes] of Object.entries(input.reviews)) {
  if (!allowed.has(id) || !Array.isArray(passes) || passes.length > 3 ||
      passes.some(pass => ![0,1,2].includes(pass)) || new Set(passes).size !== passes.length) return null;
  if (passes.length) reviews[id] = passes.slice().sort();
 }
 return {step:input.step,name:input.name.trim(),classCode:classes.includes(input.classCode)?input.classCode:'',
  groupCode:group?.groupCode || '',theme:input.theme,accent:input.accent,reviews,plan:input.plan,analytics:input.analytics,
  ...(tblGroup?{tblGroup}:{}),...(labStream?{labStream}:{}),...(labGroup?{labGroup}:{}),
  ...(english?{english:{pattern:english.pattern,start:english.start,end:english.end}}:{})};
}

export async function academicGroups(db:D1Database): Promise<Group[]> {
 const {results} = await db.prepare('SELECT configuration FROM review_academic_groups ORDER BY class_code, group_code')
  .all<{configuration:string}>();
 const groups=new Map<string,Group>();
 for(const row of [...verifiedSections,...results.map(row=>JSON.parse(row.configuration))].filter(validGroup))
  groups.set(row.classCode+':'+row.groupCode,row);
 return [...groups.values()];
}

export function eventsForStudent(group:Group,profile:StudentProfile) {
 return (group.events||[]).filter(event=>!event.labStream ||
  (event.labStream===profile.labStream && (!event.labGroups?.length ||
   (!!profile.labGroup && event.labGroups.includes(profile.labGroup)))));
}
