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
