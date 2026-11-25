import {ESLint} from 'eslint';
// The classic startup scripts share global bindings in their declared order. Lint
// each independently for syntax and high-confidence semantic errors; don't treat
// shared globals as undefined or apply React-specific rules to plain browser JS.
const lint = new ESLint({overrideConfigFile:true,overrideConfig:[
 {ignores:['public/vendor/**','public/heart-viewer.mjs']},
 {files:['public/**/*.js','public/**/*.mjs'],languageOptions:{ecmaVersion:'latest',sourceType:'module'},rules:{'no-debugger':'error','no-dupe-args':'error','no-dupe-keys':'error','no-invalid-regexp':'error','no-unsafe-finally':'error'}},
 {files:['public/**/*.js'],ignores:['public/labs.js','public/ospe.js','public/review-sw.js'],languageOptions:{sourceType:'script'}}
]});
const results=await lint.lintFiles(['public/**/*.js','public/**/*.mjs']);
const formatter=await lint.loadFormatter('stylish');
const report=await formatter.format(results);
if(report.trim())console.log(report);
console.log('Checked '+results.length+' authored browser JavaScript files.');
if(results.some(r=>r.errorCount))process.exitCode=1;
