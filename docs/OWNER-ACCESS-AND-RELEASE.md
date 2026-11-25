# Owner setup for GPT, Claude and Review Studio releases

Use this guide when connecting another account or approving a release. The public repository can be read without an account connection. Give write access only when an account needs to push work.

## Connect an editor

| What the editor needs | What you set up |
| --- | --- |
| Read code, answer questions or suggest a patch | Send the public GitHub URL and the [contributor guide](AI-CONTRIBUTOR-GUIDE.md). A GitHub connection is optional for a local read or clone. |
| Submit changes from a separate GitHub identity | Have the contributor fork the public repo and make a PR from their fork to `cloudflare-staging`. This needs no collaborator invitation. |
| Work on a branch in your repository | In GitHub, open **Settings → Collaborators** and invite the specific GitHub identity only if needed. Prefer a fork when read and PR access is enough. |
| Use a different Codex or GPT account | For a local coding session, open a checkout of the repo. For [Codex cloud](https://developers.openai.com/codex/cloud/), connect GitHub from that account and select only this repository in the environment. A chat or read-only GitHub connector may review code, while writing needs local Git access or an authorized coding environment. |
| Use a different Claude account | For [Claude Code in the cloud](https://code.claude.com/docs/en/claude-code-on-the-web), authorize the Claude GitHub App through browser onboarding and select only this repository if the installation offers repository selection. For local Claude Code, use a scoped GitHub identity and the checked-out repo. Keep broader local CLI credentials out of cloud setup. |

A GitHub connection belongs to the editor's own account. Share the URL and the task, and have each editor sign in with their own account. Do not share your GitHub, Cloudflare, Clerk, or Google login, API tokens, Admin phrase, or student data. Only the release operator needs production provider access.

## Protect the branch and review changes

1. On GitHub, open **Settings → Rules → Rulesets**. Set a branch rule for `cloudflare-staging` that requires a pull request and the successful `staging` job from **Cloudflare staging checks**. Require a review when a second trusted reviewer is available, keep force pushes and deletions blocked, and confirm the rule with a test PR. Protect `main` and `production-preparation` for owner-managed changes. Choose checks that actually run on each target branch.
2. Review the PR's diff and test results, especially workflow changes, migrations, authentication, and new data files. Keep fork PRs away from secrets. Treat a workflow that adds provider credentials or deploys production on push as a release-policy change.
3. Merge feature work to `cloudflare-staging`. In Cloudflare, open **Workers & Pages → review-studio-staging-20261117 → Builds** and confirm only that staging Worker follows that branch. Check the newer deployment and test the [staging URL](https://review-studio-staging-20261117.hatema2169.workers.dev) using a test account. Normal app deploys run no schema migrations.
4. If an editor no longer needs access, remove the GitHub collaborator or integrated app access for that account. Close stale PRs as needed. Leave the staging build connection in place for future releases.

At the November 22, 2026 check, GitHub reported no active rulesets or classic protections for `cloudflare-staging` or `production-preparation`. Adding this guide does not enable those settings. [GitHub ruleset setup](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)

## Owner-only production release

| Provider | Owner checks |
| --- | --- |
| Cloudflare | Confirm the production Worker, production D1 marker, private production R2, restricted Access policy during acceptance, TLS, error logs, usage alerts and available rollback. Keep its automatic GitHub deploy disabled. |
| Clerk and Google Cloud | Keep Development for staging and Production for the domain. Use the verified immutable owner account and separate Admin phrase. Google has its own OAuth client and audience. Keep it in Testing until ready for public use and complete any branding or verification requirements Google shows. |
| Porkbun | Cloudflare is authoritative for the domain. Preserve ownership and renewal settings. Normal code changes require no registrar changes. |
| GitHub | Identify the full SHA that passed staging CI and was verified on staging. Approve that exact SHA. Use the local reviewed-release gate in the [release runbook](cloudflare/PRODUCTION-READINESS.md) if GitHub has not made the manual workflow available on the default branch. |

Record the exact commit, tests, release approval, active Worker version, health results, backup reference, storage inventory and fallback version. Use [the acceptance checklist](cloudflare/ACCEPTANCE.md) before opening registration. Public launch requires your separate approval even after a restricted production deployment is working. Google audience changes, opening signup, Access changes and the `www` redirect are coordinated launch steps. Keep the original ChatGPT Site available. If a serious issue occurs, restore the private gate and use the [recovery runbook](cloudflare/RECOVERY.md).

### Prompt to send a new editor

> Update Alfaisal Review Studio in Hatem-a10/alfaisal-review-studio. Read AGENTS.md and docs/AI-CONTRIBUTOR-GUIDE.md on cloudflare-staging. Base your work on the latest cloudflare-staging and open a feature PR targeting it. Preserve existing student data and site behavior outside the request. Report tests and the changes you made. Leave production, DNS, provider accounts, and secrets to me.
