// Export only reviewed admin fields. Do not copy reporter identifiers into triage exports.
export function csvEscapeCell(value){
 let text=String(value??'').replace(/\u0000/g,'');
 // Quoting alone does not prevent spreadsheet applications from interpreting formulas.
 if(/^[\u0001-\u0020\uFEFF]*[=+\-@]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function csvRows(rows,headers){
 if(!Array.isArray(rows)||!Array.isArray(headers)||headers.length>32||rows.length>2000)throw Error('CSV export exceeds the reviewed limit.');
 return [headers.map(csvEscapeCell).join(','),...rows.map(row=>headers.map(key=>csvEscapeCell(row[key])).join(','))].join('\r\n')+'\r\n';
}

// Strict bounded CSV: supports quoted fields, escaped quotes and CRLF without evaluating formulas.
export function parseGroupCSV(input){
 if(typeof input!=='string'||input.length>32000)throw Error('CSV must be at most 32,000 characters.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{row.push(cell.trim());cell='';closed=false};
 const end=()=>{push();if(row.some(Boolean))rows.push(row);row=[];if(rows.length>31)throw Error('At most 30 student rows.');};
 input=input.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){const ch=input[i];if(quoted){if(ch==='"'){if(input[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=ch;continue;}
 if(ch===',' ){push();continue}if(ch==='\n'||ch==='\r'){if(ch==='\r'&&input[i+1]==='\n')i++;end();continue}
 if(ch==='"'&&!cell&&!closed){quoted=true;continue}if(closed||ch==='"')throw Error('Invalid CSV quoting.');cell+=ch;}
 if(quoted)throw Error('Unclosed CSV quote.');if(row.length||cell)end();
 const keys=['email','studentGroup','studentSection','labGroup'];
 if(!rows.length||rows.shift().join(',')!==keys.join(','))throw Error('Use header email,studentGroup,studentSection,labGroup.');
 if(!rows.length||rows.some(r=>r.length!==4))throw Error('Provide four columns for each student.');
 return rows.map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]])));
}
