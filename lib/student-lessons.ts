import {studentLessonPacks} from './student-lesson-packs.generated';

export type Question={id:string;question:string;options:string[];answer:number;reasons?:string[];explanation?:string};
export type Topic={id:string;title:string;body:string[];keyPoints:string[];questions:Question[]};

export async function studentTopics(id:string):Promise<Topic[]> {
 if (!Object.hasOwn(studentLessonPacks,id)) return [];
 const bytes=Uint8Array.from(atob(studentLessonPacks[id]),character=>character.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Response(stream).json<Topic[]>();
}
