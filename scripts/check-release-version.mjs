import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// The last production Worker before auth/config carried the displayed version.
const preHeaderWorker = '7aa8c656-173d-4a3e-b10f-158a642a2ada';

export function nextReleaseVersion(candidate, liveDisplay, workerVersion) {
 const [major, minor] = /^v(0|[1-9][0-9]*)\.([0-9]{2})$/.exec(liveDisplay || '')?.slice(1) || [];
 const live = liveDisplay ? Number(major)*100+Number(minor) : workerVersion===preHeaderWorker ? 166 : NaN;
 if(!Number.isSafeInteger(live)||live<1)throw Error('Could not verify the live site version.');
 const next = live+1;
 const expected = 'v'+Math.floor(next/100)+'.'+String(next%100).padStart(2,'0');
 if(candidate.siteVersion!==next||candidate.displayVersion!==expected)throw Error('The release must advance the live site version by exactly 0.01. Expected '+expected+'.');
 return expected;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=new URL('../public/site-release.json',import.meta.url);
 console.log(nextReleaseVersion(JSON.parse(readFileSync(file)),process.argv[2],process.argv[3]));
}
