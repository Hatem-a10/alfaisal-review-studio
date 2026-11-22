import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const commit = value('--commit');
const stagingRef = value('--staging-ref') || 'origin/cloudflare-staging';
const workflow = value('--workflow') || 'cloudflare-staging-check.yml';
const workflowFile = workflow.split('/').at(-1);
if (workflowFile !== 'cloudflare-staging-check.yml') throw new Error('Use the staging verification workflow.');
const repository = value('--repo') || process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!/^[0-9a-f]{40}$/.test(commit || '')) {
  throw new Error('A full 40-character approved commit SHA is required.');
}

const git = (...gitArgs) => {
  const result = spawnSync('git', gitArgs, {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `git ${gitArgs.join(' ')} failed`);
  return result.stdout.trim();
};

if (git('rev-parse', 'HEAD') !== commit) {
  throw new Error(`Checked out HEAD does not match approved commit ${commit}.`);
}
git('rev-parse', '--verify', `${stagingRef}^{commit}`);
const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', commit, stagingRef]);
if (ancestry.status !== 0) {
  throw new Error(`${commit} is not an ancestor of the staged ref ${stagingRef}.`);
}

if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('A valid GitHub repository is required.');
const endpoint = new URL(`https://api.github.com/repos/${repository}/actions/workflows/${workflowFile}/runs`);
endpoint.searchParams.set('head_sha', commit);
endpoint.searchParams.set('event', 'push');
endpoint.searchParams.set('branch', 'cloudflare-staging');
const data = token
 ? await fetch(endpoint,{headers:{accept:'application/vnd.github+json',authorization:`Bearer ${token}`,'x-github-api-version':'2022-11-28'}}).then(async response => {
  if(!response.ok)throw new Error(`GitHub staging-run lookup failed (${response.status}).`);
  return response.json();
 })
 : JSON.parse(spawnSync('gh',['api',endpoint.pathname+endpoint.search],{encoding:'utf8'}).stdout||'{}');
const successfulRun = data.workflow_runs?.find(run=>
 run.head_sha===commit && run.head_branch==='cloudflare-staging' &&
 run.status==='completed' && run.conclusion === 'success');
if(!successfulRun)throw new Error(`No successful ${workflow} push run exists for ${commit}.`);

const receipt = {
  approvedCommit: commit,
  stagedRef: stagingRef,
  stagingWorkflow: workflow,
  stagingRunId: successfulRun?.id ?? null,
  githubVerified: Boolean(successfulRun),
  productionDeployment: false,
  productionMigration: false,
};
console.log(JSON.stringify(receipt));
