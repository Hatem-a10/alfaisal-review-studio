# Alfaisal Review Studio agent instructions

Read this file before any repository change. Apply the user's task and permissions first, subject to platform and security constraints. For project decisions use this file, then the current linked runbook or lesson standard, then dated historical notes. Verify the actual code, tests, provider state and deployed commit when behavior may have drifted. Flag conflicts with safety rules, data contracts or tested requirements before changing them.

## Environments and review

| Target | Source and operation |
| --- | --- |
| [Production](https://alfaisal.review/) | Cloudflare Worker `review-studio-production`, separate production D1 and private R2, Clerk Production. Exact reviewed source and runtime configuration require explicit owner approval. |
| [Staging](https://review-studio-staging-20261117.hatema2169.workers.dev/) | `cloudflare-staging` feeds this Worker only. It has its own D1 and private R2 plus Clerk Development. Use synthetic accounts and records. |
| Release references | `production-preparation` holds reviewed preparation history. `main` is the stable repository default. Branch tips do not prove what is deployed. |
| Original ChatGPT Site | Separate legacy hosting, auth and data. Preserve it. Its tools and version numbers apply only to explicitly authorized legacy releases. |

Branch from the latest `cloudflare-staging`, use a focused feature PR, and check GitHub Actions and the staging Worker separately. Verify the staged source from deployed build metadata and exercise the changed behavior. Use [the Cloudflare release runbook](docs/cloudflare/PRODUCTION-READINESS.md) for production approvals, build, binding checks, receipts and rollback. Never run a migration during a routine deploy. Never apply staging bindings, test credentials or old Sites storage receipts to production.

Owner approval is required for the exact production release, auth/provider/account-role or access changes affecting live users, DNS, public registration, paid services, production migrations, sensitive data exports, destructive actions and legacy publication. Keep secrets, student data, private academic originals and backups out of Git, chats, screenshots and logs. Use the approved provider secret store and signed-in operator workflows.

For every production update, advance the last live site version by exactly 0.01. Run `node scripts/set-site-version.mjs` when the candidate still has the live build number. The production workflow checks the live version before upload and the new displayed version after deployment.

## Account and data invariants

- Clerk verifies sessions server-side. Account ownership uses the issuer and immutable Clerk subject, with verified primary email. The configured owner subject controls ownership. D1 stores staff roles and app records. The Admin phrase and recent first-factor proof protect sensitive owner writes. Email, name and a browser flag never confer a role. See [Admin Control Center](docs/cloudflare/ADMIN-CONTROL.md).
- Preserve per-account D1/R2 keys, the revision and conflict checks, the three individual review-pass timestamps, saved answers, mock attempts and scoring, account settings, Anki IDs and intervals, and private materials. Online startup verifies identity before restoring personal state. Keep authenticated APIs out of shared offline caches.
- Keep UI and academic behavior outside the task stable. Reuse existing modules and supported entry points. Run focused checks for routine updates, and the complete suite for major changes, every fifth version milestone or an explicit request. Release checks include lint, the appropriate builds, privacy checks and relevant browser tests. Separate test evidence from unverified claims.

## Academic changes

Read [Lesson Content Standards](docs/LESSON-CONTENT-STANDARDS.md) for every lecture, MCQ, figure or source change. Start with `public/data.js`, assembled curriculum and inline topic grouping, source/library registries, and the current lesson audit. Generated `dist/` is build output. Course data may have overlays and deferred packs. Inspect the resulting runtime view before counting or editing content.

1. Inspect the lesson, objectives, teaching and current inventory.
2. Match canonical slides and supporting documents by lecture, exact page range, SHA-256 and existing associations.
3. Identify genuine gaps and verify proposed changes against the sources. Log unsupported or conflicting material for review.
4. Preserve stable lecture, topic, question and choice IDs, corrected booklet provenance, printed keys and accepted alternatives. Keep private files in approved storage.
5. Validate references, images, option explanations, difficulty and topic mapping. Use the coverage audit before and after, run integrity and regression checks, and submit through staging.
6. Record what changed and what remains unverified. Quality targets never justify inaccurate or repetitive questions.

Keep class schedules grounded in verified group files. Use the REN123 timetable for conflicts. Keep Accurate CVP category preferences soft, required repeat families and 10–16 actual question-image items, with the current verified-source filters. Historical hard category ranges and fixed floors are superseded. During active exams keep hints, keys, provenance and repeat labels hidden except the explicitly approved Cheat Mode reveal. Keep Booklet subpart context, stable scoring, and prior attempts.

See the [instruction audit](docs/history/AGENTS-instruction-audit.md) and [historical instructions](docs/history/AGENTS-native-sites.md) for legacy release notes and superseded rules.
