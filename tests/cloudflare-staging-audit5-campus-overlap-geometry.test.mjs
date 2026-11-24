import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="function campusLayout(events){const result=new Map(),days=new Map();for(const e of events){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)}for(const rows of days.values()){const ordered=rows.slice().sort((a,b)=>a.start-b.start||a.end-b.end||String(a.id).localeCompare(String(b.id)));let group=[],ends=[],lastEnd=-1;const finish=()=>{const count=ends.length;for(const [e,lane] of group)result.set(e,{lane,count});group=[];ends=[]};for(const e of ordered){if(e.start>=lastEnd){finish();lastEnd=-1}let lane=ends.findIndex(end=>end<=e.start);if(lane<0)lane=ends.length;ends[lane]=e.end;lastEnd=Math.max(lastEnd,e.end);group.push([e,lane])}finish()}return result}";
const source=readFileSync(new URL('../public/schedule-ui.js',import.meta.url),'utf8');
const candidate='let campusLayoutSnapshot=null;\n'+source.split('\n').find(l=>l.startsWith('function campusLayout('));
const compile=code=>vm.runInNewContext(code+'\ncampusLayout');
const original=compile(baseline),optimized=compile(candidate);
const values=(fn,rows)=>{const map=fn(rows);return rows.map(row=>map.get(row)||null).map(v=>v?{lane:v.lane,count:v.count}:null)};
const normalize=x=>JSON.parse(JSON.stringify(x));
function events(n,metric){return Array.from({length:n},(_,i)=>{const raw={id:'event-'+(i%200),date:'2026-11-'+String(24+i%5).padStart(2,'0'),start:480+((i*7)%17)*20,end:500+((i*7)%17)*20+(i%4)*18};return {get id(){metric.count++;return raw.id},get date(){metric.count++;return raw.date},get start(){metric.count++;return raw.start},get end(){metric.count++;return raw.end},set start(v){raw.start=v},set end(v){raw.end=v}}})}
const median=fn=>{fn();const samples=[];for(let i=0;i<7;i++){const t=performance.now();fn();samples.push(performance.now()-t)}return samples.sort((a,b)=>a-b)[3]};
test('A5-125 reuses overlap geometry only for exact ordered event geometry',()=>{
 for(const n of [0,1,5,50,1000]){const metric={count:0},rows=events(n,metric),fresh=events(n,{count:0});
  assert.deepEqual(normalize(values(optimized,rows)),normalize(values(original,rows)));
  assert.deepEqual(normalize(values(optimized,fresh)),normalize(values(original,fresh)));
  if(n){fresh[0].end+=17;assert.deepEqual(normalize(values(optimized,fresh)),normalize(values(original,fresh)));
    fresh.reverse();assert.deepEqual(normalize(values(optimized,fresh)),normalize(values(original,fresh)));
  }
 }
 const a={id:'same',date:'2026-11-24',start:480,end:540},b={id:'same',date:'2026-11-24',start:500,end:620};
 for(const rows of [[a,a,b],[a,b,a],[a,b,a,b],[]]){
  assert.deepEqual(normalize(values(optimized,rows)),normalize(values(original,rows)));
 }
});
test('A5-125 large multi-day timetable avoids redundant overlap sorting',()=>{
 const metric={count:0};const rows=events(1800,metric),fresh=events(1800,metric);
 assert.deepEqual(normalize(values(optimized,rows)),normalize(values(original,rows)));
 metric.count=0;values(original,fresh);const originalReads=metric.count;
 metric.count=0;values(optimized,fresh);const cachedReads=metric.count;
 assert.ok(cachedReads<originalReads/2,{originalReads,cachedReads});
 const baselineMs=median(()=>values(original,events(1800,{count:0})));
 optimized(rows);
 const candidateMs=median(()=>values(optimized,events(1800,{count:0})));
 console.log(JSON.stringify({label:'A5-125 reused campus overlap lanes',baselineMedianMs:baselineMs,candidateMedianMs:candidateMs,originalReads,cachedReads,events:1800}));
});
