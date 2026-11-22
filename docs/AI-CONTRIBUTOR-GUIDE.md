# Review Studio guide for GPT, Codex and Claude editors

Alfaisal Review Studio is a medical study planner, lesson library, practice and mock-exam app, Anki workspace, and student administration system. Use the existing app and repository.

- [Repository](https://github.com/Hatem-a10/alfaisal-review-studio)
- [Cloudflare staging](https://review-studio-staging-20261117.hatema2169.workers.dev)
- [Cloudflare production](https://alfaisal.review) requires authorized access during acceptance.
- [Original ChatGPT Site](https://alfaisal-review-studio.barcman2000.chatgpt.site/) is a separate deployment with separate authentication and data.

## Start a change

1. Read [AGENTS.md](../AGENTS.md), [Deployment](DEPLOYMENT.md), and the relevant feature docs or tests. The repository includes historical instructions for native ChatGPT Sites releases. Apply Cloudflare instructions to Cloudflare work and check any historical product behavior against the current code and the owner's latest request.
2. Fetch the upstream repository and branch from its current `cloudflare-staging`. In a local clone, run `git fetch origin cloudflare-staging` and `git switch -c fix/short-description origin/cloudflare-staging`. In a fork, use the corresponding `upstream` remote. Check the current branch, commit, and working tree first.
3. Make the smallest complete change. Push the feature branch or a fork branch and open a pull request targeting `cloudflare-staging`. Include symptoms, behavior changed, files, tests, and any content, migration, security, or release implications.
4. The owner reviews and merges. Then verify staging separately. `cloudflare-staging` feeds the existing staging Workers Builds integration. Keep `main` and `production-preparation` for owner-managed releases. A green PR, a GitHub push, and a deployed Worker are three separate results.

## Where the code lives

| Area | Start here |
| --- | --- |
| App shell, navigation, study data and styles | `public/index.html`, `public/app.js`, and nearby `public/` feature files |
| Lessons, exams and booklet | `public/` learning and exam modules, `public/cvp19-booklet.json`, and `docs/content-audits/` |
| Cloudflare fetch, Clerk and access controls | `worker/staging.ts`, `lib/managed-auth*.mjs`, `lib/production-access.mjs`, and `lib/admin-*.mjs` |
| Progress, private files, and sync | `app/api/`, `lib/`, and device bootstrap in `public/index.html` |
| Academic config and schema | `staging/`, `drizzle/`, and `production/identity.sql` |
| Build and release | `package.json`, `scripts/`, `.github/workflows/`, and [Cloudflare release instructions](cloudflare/PRODUCTION-READINESS.md) |

The application uses Next.js-compatible routes, vinext/Vite for Cloudflare, and a browser-based study shell. Use Node 24, which matches CI. Build output is generated in `dist/`.

## Checks

```sh
npm ci
npm run lint
npm run check:cloudflare
node --test tests/*.test.mjs
npm run build:staging
npm run build:production-candidate
node scripts/check-production-guard.mjs
npx --no-install wrangler deploy --dry-run --config dist/server/wrangler.json
```

Use targeted tests while iterating. Run the full suite for broad changes, release candidates, milestone releases, or when requested. Staging CI runs the full test suite, both builds, access checks, a local recovery rehearsal, and a dry run. Keep all failures visible and report the exact scope of any skipped or unverified browser checks. An emulated viewport or desktop WebKit run does not establish physical iPhone or iPad Safari behavior.

## Preserve accounts and academic content

- Use synthetic users and data in staging. Keep production, staging, and the original Site on their own authentication, D1 and R2 resources. Progress sync uses account-scoped identifiers and revision conflict checks. Preserve account switches, offline queues, saved attempts and the three review passes.
- Admin authorization is server-side and tied to a verified Clerk identity and role. The Admin phrase is an additional owner check. Keep direct API guards, private file authorization and the separate recent sign-in requirement.
- Keep stable lecture, question, choice and objective IDs. Preserve printed keys and saved scoring unless the owner explicitly approves a sourced correction. In a running exam, keep hints, keys, explanations and source or repetition labels hidden. Preserve the approved source filters and image coverage for Accurate mode.
- Verify supplied materials before changing content. Keep restricted originals and personal files out of Git. A public code repository does not make private study files or student data public resources.
- Keep credentials, owner identifiers, personal records, backups and provider exports out of commits, PRs, screenshots and logs. Use ignored local files or approved provider secret stores where authorized. A feature PR needs no production secrets.
- Do not deploy production, change DNS, alter public signup, run production migrations, reset study data, or change billing from a feature task. Ask the owner for explicit approval when one of those actions is the task.

See [owner access and release setup](OWNER-ACCESS-AND-RELEASE.md), [acceptance checks](cloudflare/ACCEPTANCE.md), and [recovery](cloudflare/RECOVERY.md).
