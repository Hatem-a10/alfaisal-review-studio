// Advance the site version by exactly 0.01 everywhere it appears:
// public/site-release.json, the version badge in public/index.html and the offline cache name.
// Usage: node scripts/bump-version.mjs   (run once per production release)
import {readFileSync, writeFileSync} from 'node:fs';

const file = path => new URL('../' + path, import.meta.url);
const release = JSON.parse(readFileSync(file('public/site-release.json'), 'utf8'));
const next = release.siteVersion + 1;
const display = 'v' + Math.floor(next / 100) + '.' + String(next % 100).padStart(2, '0');

const replaceOnce = (path, from, to) => {
  const text = readFileSync(file(path), 'utf8');
  if (text.split(from).length !== 2) throw Error(`Expected exactly one "${from}" in ${path}`);
  writeFileSync(file(path), text.replace(from, to));
};

replaceOnce('public/index.html',
  `id="siteVersion" title="Site version ${release.siteVersion}">${release.displayVersion}</span>`,
  `id="siteVersion" title="Site version ${next}">${display}</span>`);
replaceOnce('public/phase3-cache-policy.mjs', `'review-studio-sw-${release.displayVersion}'`, `'review-studio-sw-${display}'`);
writeFileSync(file('public/site-release.json'), JSON.stringify({siteVersion: next, displayVersion: display}) + '\n');
console.log(`${release.displayVersion} → ${display}`);
