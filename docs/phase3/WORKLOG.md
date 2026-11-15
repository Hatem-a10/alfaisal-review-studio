# Phase 3 — v1.50 release checkpoint

Existing project: appgprj_6ade126fa77081919dc24e7a87700a9f. Native owner inspection confirms current public audience and https://hub.barcman2000.chatgpt.site. Preserve that audience, project, D1 DB and R2 BUCKET. Historical documentation's old private URL is superseded by current native state.

Implementation:
- Server-verified persistent Admin role, salted PBKDF2 password verifier in native secret configuration, per-account atomic rate limit and same-origin POST validation. Existing owner is verified by native-confirmed contact in a server-only allowlist (site-specific user ID is not guessed from native account UUID). Ordinary curriculum shared uploads remain owner-only; elevated Admins may share Anki packages. Shared packages capped at 20 MiB to bound Worker memory. Admin history bypass is verified by server capability, never the old client unlock hash.
- Crown beside first name, server role refresh and ordinary five-mock cap versus Admin unlimited item count (existing account snapshot byte limits still apply).
- Anki backgrounds use device/account IndexedDB, validated image types/8 MiB limit, fit/dim, removal/default restoration. Pending suffix-only shuffle and restore after answer/skip preserve IDs, due dates and history. Duplicate key/account migration retains legacy originals. Space and 1–4 work in cards and frame, excluding typing/modal contexts; asynchronous advances are guarded.
- Source-qualified lecture/deck matches produce exact-card contextual practice pills; no generic word matches or fabricated relationships. Lecture and checked-question actions never expose strict exam answers.
- v1.50 module Service Worker, generated core asset manifest, account-separated visited private-resource cache, lightweight no-store identity probe and fresh-network-first reads. No credentials, auth/admin, grade/progress API responses, mutations, or deck-upload endpoints cached. Downloaded decks, generated mocks and progress already persist in account-specific device stores; existing durable dirty queue reconciles on reconnect without replacing newer cloud progress.
- New Anki code is deferred after app startup instead of increasing the startup budget. Component polish, responsive targets and short transform/opacity feedback respect OS and app reduced motion. Settings milestone appears only at v1.50.

Validation before promotion:
- 318/318 full Node tests passed, 0 skipped/failed.
- Full lint: 0 errors; existing legacy global-script unused-variable warnings retained (100 on initial final run).
- TypeScript noEmit passes.
- Phase 2 browser suite: 44/44, no exceptions.
- Phase 3 browser suite: 26/26, no exceptions; includes actual browser IndexedDB storage/isolation, role UI, shuffle, exact crosslinks, phone/tablet/desktop Anki fit and offline app reopening.
- Phase 1 browser final run: 154/154, no exceptions. The historical version expectation now follows release metadata. Across the three browser suites: 224 checks pass.
- Final pre-promotion build passes: startup 7,219,667 raw / 1,615,367 gzip bytes, within unchanged budgets; one classic startup request. Phase 3 stylesheet parses successfully. Final native publication is pending below.

Coverage audit preserved from Phase 2: ordinary pool covers all 79 lectures (4,118 items). Exam-eligible pool (2,147) lacks MOL-23, MOL-24, MOL-25 and MOL-26; Accurate CVP pool (1,069) lacks CVP-A23. No fake replacement questions authored. See ../phase2-practice-audit.md and ../phase2-practice-coverage.json.

Practical limits: browser checks emulate viewport sizes, not physical Safari/iPhone/iPad. Offline private resources must first be opened online after the worker is ready; no claim that all R2 content is downloaded. Shared device offline access relies on the device's saved account binding. Browser storage can be evicted by the OS; cloud remains the durable backup. Reconnection sync is verified while the app is open/reopened, not a promise that iOS runs a closed app. Live authenticated account/device acceptance is distinct from local synthetic tests. No production study snapshots or files have been reset or migrated.

## Final promotion

All Phase 3 work and checks completed before promotion. Version is now native151/displayv1.50. Final promoted build and 26 browser checks pass, including offline reopening. Production runtime revision1 contains the Admin verifier and verified owner contact as secrets; their values are not in source. No production user snapshot writes were performed. The official source helper will package this checked source for the existing Site. Native publication status is recorded separately in the release receipt.

Contributions: Terra completed server authorization/shared uploads/types and Anki storage/study controls; Luna completed component styling and full lint/test harness repair. Root completed integration, cross-links, offline identity improvements, deferred startup, full browser QA and native release. Full changed-file inventory: modified-files.txt.
