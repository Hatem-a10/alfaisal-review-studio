export type GradeRow={name:string;weight:number;earned:number|null;total:number;questions?:number;equalMarks?:boolean};
export type Grades=Record<string,GradeRow[]>;

export function validGrades(input:unknown): input is Grades {
 if (!input || typeof input!=='object' || Array.isArray(input)) return false;
 const courses=Object.entries(input);
 return courses.length<=24 && courses.every(([course,rows])=>course.trim().length>0 && course.length<=60 &&
  Array.isArray(rows) && rows.length<=40 && rows.every(row=>row && typeof row.name==='string' &&
   row.name.trim().length>0 && row.name.length<=120 && Number.isFinite(row.weight) && row.weight>=0 &&
   row.weight<=100 && Number.isFinite(row.total) && row.total>0 && row.total<=10000 &&
   (row.questions===undefined || (Number.isInteger(row.questions)&&row.questions>0&&row.questions<=10000)) &&
   (row.equalMarks===undefined || typeof row.equalMarks==='boolean') &&
   (row.earned===null || (Number.isFinite(row.earned) && row.earned>=0 && row.earned<=row.total))));
}

export function gradeForecast(rows:GradeRow[],target:number) {
 const total=rows.reduce((sum,row)=>sum+row.weight,0);
 const recorded=rows.filter(row=>row.earned!==null);
 const contribution=recorded.reduce((sum,row)=>sum+row.weight*row.earned!/row.total,0);
 const completedWeight=recorded.reduce((sum,row)=>sum+row.weight,0);
 const remaining=total-completedWeight;
 const configured=Math.abs(total-100)<1e-6;
 const maximum=contribution+remaining;
 return {total,contribution,average:completedWeight?contribution/completedWeight*100:null,
  configured,maximum,possible:maximum+1e-6>=target,
  required:remaining?Math.max(0,target-contribution)/remaining*100:null,
  room:Math.max(0,maximum-target),
  wrongAllowed:rows.map(row=>configured && maximum+1e-6>=target && row.earned===null && row.weight>0 &&
   row.equalMarks && row.questions ? Math.min(row.questions,Math.floor((maximum-target)/row.weight*row.questions+1e-6)) : null)};
}
