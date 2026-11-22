# Cloudflare staging verification

Current Phase 2 results and fresh-account architecture: [PHASE2.md](PHASE2.md). The Phase 1 checks below are historical evidence; synthetic-password authentication has been superseded by Clerk.

Date: 17 November 2026. This is a test deployment, not a production migration.

Full-suite repair update: **369 passed, 0 failed, 0 skipped** locally. All361 original tests remain, with eight additional regressions. See [the per-failure audit](TEST-REPAIRS.md). Production and staging builds and vinext compatibility are checked independently.

## Deployment and source isolation

- Staging URL: https://review-studio-staging-20261117.hatema2169.workers.dev
- Worker, D1 database and private R2 bucket: review-studio-staging-20261117.
- D1 ID: 1540bad8-aa39-4c73-9484-28cfd5ea2a05.
- Source branch: cloudflare-staging in private Hatem-a10/alfaisal-review-studio.
- main remains 0d9b88704732f3922f65f4d4b9bd7c1f0f6accaf. Original Sites checkout and production storage/authentication/DNS are unchanged.
- Official Workers Builds is connected only to this staging Worker and cloudflare-staging. Additional branch builds are disabled. Automatic builds/deployments run no database migrations.
- GitHub Actions and Cloudflare Workers Builds both successfully validated/deployed 65ca169. Later fixes are tracked through their own check runs; never treat Git push alone as deployment confirmation.

## Completed checks

| Area | Evidence / outcome |
| --- | --- |
| Compatibility | vinext check supports all 2 Next imports and 5 recognized libraries; warnings concern browser-only vendored UMD globals. Independent Workers build passes. |
| Required staging tests | Auth, configuration and deferred-startup tests remain included in the complete passing suite. |
| Existing full suite | 369/369 passing after repairing15 obsolete/broken test cases and adding eight regressions. No tests deleted or disabled. GitHub full-suite failures now fail the job. |
| Live API | 8 checks passed: forged headers rejected, synthetic roles, academic table response, distinct account keys, D1 progress write, account isolation, private media auth. |
| Live R2/D1 | 14 checks passed: private/shared Anki uploads and exact downloads, student shared-upload rejection, private materials isolation, large progress overflow and roundtrip, encoded/raw private path guards. |
| Curriculum | All 660 registered SITE_ASSETS uploaded from exact local Git blobs to staging R2 with server checksums. All 910 STUDY_ASSETS matched local files by SHA/size and uploaded with server readback verification; final status 910/910. No production bucket copied. |
| Homepage/navigation | Synthetic login, app startup, Dashboard, Learn, Schedule, Practice, Other/Activity, Material Library, Anki and Settings visited. |
| Learn & Master | Catalog, objectives and practice sets render. No exhaustive content/medical review performed. |
| Timed mock | Generated 20-question CVP mock, choices/navigation work; submitted synthetic exam shows review, category analysis, pacing and unanswered exclusion. |
| Anki | Synthetic 3-card package downloaded, imported, revealed and rated; queue advances. |
| Cloud sync | Browser reports Cloud saved / up to date. Repair Sync reports latest progress confirmed in cloud. |
| Offline active study | Disconnected test tab, revealed/rated Anki card, then reconnected; automatic sync returned to up to date. Network override restored. After the direct-Anki startup repair, reopening the cached app while disconnected also displayed the local Anki library with the remaining due count preserved. Shared cloud listings correctly remain unavailable offline. |
| Appearance/responsiveness | Light/Dark toggles; 390x844 phone exam and 834x1112 / 1112x834 tablet schedule emulation. No page horizontal overflow in measured views. Phone Exam Controls menu fits x=9 to224 within390px. Physical Safari/iOS not tested. Temporary viewport overrides were reset. |
| Onboarding | Synthetic setup wizard, review-progress Skip and completion exercised. Starting after the CVP final reports unschedulable reviews with today placeholders; this needs product review before production launch. No real student onboarding forced. |

## Issues discovered and bounded repairs

- Workers HTML canonicalization caused a redirect loop: disabled asset html handling.
- Post-build optimized JS was absent from vinext's asset snapshot: serve static ASSETS after authentication/private-path guards.
- Deployed PBKDF2 supports at most100000 iterations despite newer local workerd accepting310000: test-only auth adapted; production admin verifier unchanged.
- Initial synthetic fixture incorrectly used answerReceipts object; corrected the disposable fixture to an array, not user progress.
- Phone exam menu extended off the left: staging-only menu alignment stylesheet.
- Existing heart mount discarded its dynamic import result and referenced undefined rendererModule: bind the awaited module locally.
- Direct Anki route could render before deferred Anki globals existed, crashing startup: guard presentation refinements until the module is ready; regression added.
- Legacy test used /private/tmp on Linux: use os.tmpdir for both write and read.

## Remaining limitations before production

1. ChatGPT Sites authentication is not portable. Staging now uses verified Clerk Development sessions. Production needs a separate Clerk Production configuration and fresh registration; no legacy identity mapping or account/progress migration.
2. Existing student progress, personal uploads and decks will not be copied. Future production D1 starts empty; only academic assets/catalogs transfer to a separate private R2 bucket.
3. Some Material Library entries depend on personal/shared document metadata in the production database. Registered files are present, but their existing production associations are deliberately absent from synthetic records.
4. The15 legacy failures are resolved; retain the complete mandatory suite and review any future failures before production cutover. See TEST-REPAIRS.md for causes, two additional defect fixes and evidence.
5. Complete physical iPhone/iPad Safari, real cross-device sessions and long offline exam/reconciliation tests. Active offline Anki rating/reconnect and cached app reopening are verified; do not generalize this to every offline flow.
6. Production needs encrypted backups/restore drill, fresh-account isolation checks, rollback, monitoring and cost limits, and explicit cutover approval. Porkbun/domain/hosting remain untouched.

Local-only credentials and receipts are in ignored .sites-runtime/staging; never commit or paste passwords, cookies or Worker secrets. See PHASE1.md for architecture and commands.

## Final code verification

Code8dd2176 passed GitHub Actions and official Workers Builds; deployed Worker version56914510-0018-41fe-a57d-e17ce69541b0 was recorded by Wrangler. Later documentation commits do not change application code. Heart model loaded successfully after repair and private asset import; ascending-aorta selection, add-to-selection and isolation were verified in the browser. Direct Anki reload opens normally and retains the synthetic review results. Browser screenshots/receipts remain ignored under .sites-runtime/staging.

## Reliability repair verification

The sync polling/upload failure was a missing-window test harness error, not an ordinary upload sequencing defect. Repair tests now use the current durable device adapter rather than the retired localStorage backup. A separately reproduced account-switch race is fixed. Inline bootstrap migration ordering now matches the canonical production adapter. No changes to academic question data, production resources, authentication or main.


## Phase 2 final verification — fresh Clerk accounts

Application commit `5341b99` passed GitHub Actions [run 44080079209](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/44080079209) and official Workers Builds. **396 tests passed, 0 failed, 0 skipped**, locally and in GitHub. All 369 baseline tests remain; 27 regressions were added. Focused managed-auth/Worker lint is clean. Production and independent staging builds pass; all Next imports and recognized libraries are supported by vinext. Local compatibility scanning also sees ignored npm CLI files and browser-only UMD globals, none imported into the Worker runtime.

Workers Builds deployed version `33f2acdc-cdd3-48e7-8994-77bb819fe465` to the existing staging URL. The authenticated live shell contains the fresh-account guard. Its client bundle `_studio/client-2737f4e19912d825.js` matches the local build exactly (SHA-256 `2737f4e19912d82542c107c9e2fbbc99258493857b5c85da7421cf4648a3593a`). Health reports Clerk with D1/R2 bound.

The verified new owner completed onboarding and the local Admin phrase bootstrap, unlocked Admin Settings and opened Registered students. A separate synthetic student registered through email-code verification, completed all six setup steps with review Skip, saw 0 overdue/0 completed reviews, synced, signed out and signed back in. Returning-account testing discovered and fixed an unchanged-response onboarding loop; the live repair restores M2-B / Group 2.9 without repeating setup. Phone 390x844 auth and tablet 834x1112 dashboard emulation showed no horizontal page overflow; no physical iOS hardware claim.

All 14 live managed-auth API checks passed, including independent D1 progress and Anki uploads, unauthorized shared-upload/directory rejection, default-off analytics, exact curriculum SHA, spoofed-header denial and session revocation after the bounded cache. No production student record or storage was migrated. The existing 660 curriculum/910 study assets were retained without reupload. Repository remains private and `main` remains `0d9b88704732f3922f65f4d4b9bd7c1f0f6accaf`.

See PHASE2.md for fresh-production prerequisites and the deliberately remaining physical-device, long-offline and production-provider checks. No old-to-new account mapping, historical imports or student-record merging is required or planned.

## Phase 3 Admin Control Center

Phase 3 added 29 tests on top of the 399-test staging baseline (including the earlier 396 Phase 2 tests). The complete suite passes **428 tests, 0 failures, 0 skipped**. Tests cover server role checks and forged requests, owner step-up and protection, scoped session revocation, reversible scheduling and resources, announcements, question correction approval, storage boundaries, consent and progress preservation. Native application build, isolated staging build, production candidate build and production Worker dry run passed locally. Focused lint was clean. The vinext scan still reports CommonJS globals in browser vendor assets and ignored tooling, outside the Worker import path.

The additive `staging/admin-*.sql` schemas were applied to the existing staging D1 database. GitHub main, the native Site and production bindings were outside the release. See [Admin Control Center](ADMIN-CONTROL.md) for role boundaries, operations and production prerequisites.

The browser layout fixture is `scripts/check-admin-control-layout.mjs`. It uses Playwright Chromium with synthetic API responses. Set `REVIEW_STUDIO_PLAYWRIGHT_MODULE` and `REVIEW_STUDIO_BROWSER` if using an existing Playwright installation and browser binary. Run it from the repository root. Browser emulation does not verify physical iPhone or iPad Safari.

The browser fixture passed at 390×844 in both themes, 834×1112 Light, 1112×834 Dark, and 1366×900 Dark. GitHub Actions [run 45001048191](https://github.com/Hatem-a10/alfaisal-review-studio/actions/runs/45001048191) passed. Workers Builds deployed the admin release to the existing staging URL; the live build manifest confirmed follow-up commit `f3ddba8`. All 28 live API smoke checks passed with two separate Clerk Development test accounts. They covered anonymous and forged-identity denial, all administrator sections rejecting students, cross-origin protection, private report submissions, student announcement and resource reads, consent defaults, and distinct progress namespaces. Owner-only actions and delegated roles were exercised with isolated database fixtures; the live smoke test did not assume or modify the existing owner's account.

## Restricted production preparation

Baseline was 428 passing tests at staged commit `d95495c`. The new local candidate passes 432 tests with zero failures or skips. The native build, staged-target build, independent production-candidate build and Wrangler dry run passed. The compiled Worker was exercised with synthetic bindings and rejected direct and encoded registration URLs, a mismatched origin, and forged identity headers on protected endpoints. The compatibility scanner retains its existing browser-vendor and ignored tooling CommonJS warning. No production Worker was deployed.

An additional 16 live staging checks with new synthetic Clerk Development accounts verified clean initial progress, isolated account IDs, private Anki uploads and downloads, restricted shared uploads, Clerk session revocation, and a same-account second session reading the first session's saved revision. A stale write with revision zero returned 409. These checks do not cover a full browser offline replay. The staged release remains on the previously deployed source; the production preparation is separate.

The full source asset inventory, local materialized payload tree, and offline re-read all verified 1,571 expected R2 payload objects (463,610,569 bytes). The encrypted recovery rehearsal restored D1 and three R2 objects into fresh local Workers bindings after the source was disposed. Database integrity, account scope, progress revision, archive tamper detection and all three SHA-256 checks passed. Hosted restore and destination asset verification still require separate approval and resources. See [production readiness](PRODUCTION-READINESS.md), [recovery](RECOVERY.md), [academic assets](ASSET-TRANSFER.md), and [device acceptance](ACCEPTANCE.md).

## alfaisal.review production provisioning

Cloudflare's Free zone exists for the intended account. Assigned nameservers are `jose.ns.cloudflare.com` and `sara.ns.cloudflare.com`. Porkbun still serves the domain pending explicit registrar confirmation. The Cloudflare zone holds the six provider-supplied DNS-only Clerk records and no application hostname. A separate `review-studio-production` Worker holds a closed 503 response and has no routes, workers.dev or previews. The fresh D1 has the production environment marker and zero accounts, progress records or personal materials. Production Clerk credentials are Worker secrets, separate from staging.

Clerk Production is invite-only and passwordless. Provider configuration readback confirmed required verified email codes and no mandatory MFA. The production candidate checks a recent signed first factor for the separate session-bound Admin phrase challenge and every privileged owner write. Clerk DNS and Google OAuth require hosted verification. Owner bootstrap, protected routing and final launch require their respective approval steps.

The hosted encrypted recovery drill restored synthetic revision 17 into a separate remote D1 database and recovered its R2 object under a separate prefix in a disposable bucket. D1 integrity, missing-object rejection and SHA-256 readback matched. The actual production database was not used for restore testing. See [device acceptance](ACCEPTANCE.md) for physical iPhone and iPad checks.

A rollback on the disposable unrouted recovery Worker restored the first of two synthetic versions to 100% traffic. The production Worker and database were outside the drill. The GitHub staging checks for the Clerk Hobby update passed, and the production candidate remains restricted and unrouted while registrar approval, Clerk verification and Google OAuth are pending.
