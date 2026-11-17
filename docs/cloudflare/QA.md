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
