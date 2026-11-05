# Review Studio: local checks + native Sites publishing

Verified 2026-11-02. This is the existing Site, not a replacement:

- URL: https://alfaisal-review-studio.barcman2000.chatgpt.site/
- Project: `appgprj_6ade126fa77081919dc24e7a87700a9f`
- Manifest: `.openai/hosting.json`; preserve `d1: DB` and `r2: BUCKET`.
- Local checkout: `/Users/hatemalabrach/Documents/Codex/2026-10-25/referenced-chatgpt-conversation-this-is-an/outputs/review-tracker`

## What is and is not supported

The official Sites docs describe publishing in ChatGPT web/desktop and explicitly say the Codex CLI/IDE has no standalone Sites management view. No public REST deployment API, permanent Sites CLI login, or generally enabled push-to-deploy contract was found. The installed official Sites plugin does provide native source-credential and save/deploy operations, plus a local helper for source synchronization and packaging. Its Git source repository is not, by itself, an independent deployment service.

Sources:
- https://learn.chatgpt.com/docs/sites/creating-a-site
- https://learn.chatgpt.com/docs/sites/publishing-and-sharing
- Installed official Sites instructions: `~/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/skills/sites/SKILL.md`

An ordinary ChatGPT conversation may use **Chat On Steroids for local Terminal/files and the native Sites connection for publication** when both toolsets are available there. Sites is installed/enabled on this account. That does not establish which tools a different conversation exposes. Terminal access alone cannot invoke the native Sites tools. If the chat cannot obtain the official Sites credential or save/deploy tool, stop at local preparation and use a Sites-enabled conversation. Do not replay browser requests, extract cookies, invent endpoints, or promise that a shell-only deployment succeeded. An OpenAI API key or Cloudflare token is not configured as a substitute.

## Commands

From the checkout:

```sh
./scripts/review-studio-release check
```

Runs all checked-in Node regression tests, builds, and verifies source and built project/storage identities. It does not publish, migrate a production database, or upload materials. The wrapper uses Node on PATH or the existing bundled local Node runtime. Dependencies must already be installed.

```sh
./scripts/review-studio-release open
./scripts/review-studio-release prepare
./scripts/review-studio-release status
```

`open` and `prepare` require fresh JSON from the authenticated **native Sites connector**, sent through hidden stdin, not a shell argument, command substitution, environment variable, file, or log. They are assistant orchestration steps, not standalone credential/login commands. Never ask the user to paste a credential manually. The script announces when stdin is ready and masks Terminal input before accepting it.

- `open` input: `{ "credential": <native source credential object> }`. Returns an opening receipt with project ID, checkout path and commit SHA. Open/synchronize before editing. It refuses divergent history; do not force-push.
- `prepare` input: `{ "credential": <fresh native credential>, "source": <opening receipt> }`. Runs tests/build, uses the installed official helper to commit/push approved changes, packages the exact build, and returns `project_id`, `commit_sha`, `archive`, `published: false`.
- **Preparation stages all nonignored changes** through the official helper. Review `git status`/diff first; preserve unrelated edits separately instead of accidentally publishing them. Do not run concurrent edits during preparation.
- The archive is a sibling folder `../review-studio-releases/`, outside the source tree. Non-secret receipts/lock live under ignored `.sites-runtime/release/`. Credentials are never written there.
- `REVIEW_STUDIO_SITES_PLUGIN` may select another absolute installed official Sites plugin root after an upgrade. No helper is downloaded or vendored by this script.
- `publish`/`deploy` modes deliberately fail with an explanation. They are not functional Terminal publishing commands.

## Assistant: exact end-to-end procedure

1. Read `AGENTS.md` and current official Sites skill; check local changes. Call native Sites `get_site` for the exact existing project. Preserve owner-only access, URL, DB/BUCKET bindings, runtime values and all user data. This wrapper intentionally targets the currently owner-private Site; if the audience changes, re-read the official skill and use the correct supported native operation. Do not change sharing to satisfy the wrapper.
2. Call native `create_source_repository_write_credential` for that same project. Do not opt into automatic publish-on-push for this explicit workflow. Keep the response in session memory. If an existing automatic publication window is active, reconcile it through Sites rather than mixing the two publishing methods. Never inspect browser cookies or credentials.
3. Launch `./scripts/review-studio-release open` in a retained PTY. Wait for “Ready for native Sites JSON”; send `{credential}` as a single newline-terminated stdin write. Keep the returned opening receipt in memory. Use the connector's own structured execution tool to pass JSON safely; do not interpolate secrets into shell code.
4. Edit the local project through Chat On Steroids, reviewing only intended changes. Preserve stable lesson/question identifiers, progress and storage. Refresh the short-lived source credential when needed.
5. Launch `./scripts/review-studio-release prepare` in a retained PTY; send `{credential,source}` through hidden stdin. Wait for success. The official helper validates/pushes the exact Git state; errors are not deployments. No production migrations run.
6. Pass **only** the returned `project_id`, `commit_sha`, `archive` to native `save_version_and_deploy_private`. This Site's owner-only audience must have been confirmed. These are conceptual native operation names; use the exact tool names exposed in the current chat. There is no shell/curl equivalent configured.
7. If the native result is pending/building/publishing, poll `get_deployment_status` with the returned deployment ID until terminal. On success, verify the returned URL is the existing Review Studio URL. Retain a returned saved version ID on failure; retry deployment of that version rather than saving duplicates. Never say published on Git push or receipt creation alone.
8. Optionally run `./scripts/review-studio-release record` with `{ "commit_sha": <prepared SHA>, "deployment": <successful native result> }` on stdin. This stores a non-secret audit receipt; it does not independently authenticate or poll the deployment. `status` shows what was prepared and the last native result recorded.
9. Re-read `get_site` to verify audience/identity remained unchanged. Record the test result and deployment ID in the local verification report. Keep the archive unchanged until saving succeeds. Retain it for rollback/version recovery as desired; do not ship original lecture PDFs in the package.

If interrupted after a native deployment starts, inspect that same deployment before initiating another. If a release lock survives a process crash, confirm no release process remains before removing only `.sites-runtime/release/lock`.

## Future ChatGPT prompt

> Change [describe feature] in my existing Review Studio. Use Chat On Steroids to edit the local checkout, follow AGENTS.md and docs/DEPLOYMENT.md, run scripts/review-studio-release, and use the authenticated native Sites tools to publish the exact prepared commit/archive. Preserve the existing Site URL/project, DB/BUCKET, user data and owner-only access. If Sites tools aren't available in this chat, say so instead of claiming Terminal alone can publish.

## Verification

The current task records its actual test/deployment results under ignored `.sites-runtime/release/verification.json`. A successful native publication verifies the combined **Terminal + Sites connector** path in this session. It does not prove a standalone Terminal API or that every ordinary ChatGPT conversation exposes Sites.

For small scoped changes, set `REVIEW_STUDIO_TEST_FILES=hub-upgrade.test.mjs,countdown-ui.test.mjs` (comma-separated existing test filenames) when running `check` or `prepare`. The build and identity/storage checks still run. Omit this variable for the full suite. Choose tests relevant to the actual change.

## Local visual checks

Start the existing local dev server, then run `node scripts/visual-smoke.mjs http://127.0.0.1:5173/`. It launches a separate temporary browser profile and never opens or reuses the user's browser profile. `REVIEW_STUDIO_BROWSER` can point to an installed Chromium-family executable (default: local Brave on macOS). Screenshots and the report stay under ignored `.sites-runtime/visual-smoke/`.

The check covers phone (390px), tablet (820px), desktop (1440px), light/AMOLED study screens, page overflow, lesson-card overlap, primary navigation state, button captions, horizontal toolbar, compact sidebar, and settings alignment. It checks local preview only and does not prove production cloud authentication. Inspect representative screenshots as well as the report.

## Startup and sync performance checks

`node scripts/startup-sync-smoke.mjs http://127.0.0.1:5173/ <baseline-full-SHA>` compares cold startup against the retained baseline HTML/app scripts using an isolated mobile-sized Chromium profile, 4× CPU slowdown and 100 ms latency. It also simulates two devices against a local in-memory progress endpoint, checking propagation and preservation of concurrent edits. No production snapshot is read or written. Reports stay under ignored `.sites-runtime/startup-sync/`.

Startup downloads scripts in parallel with ordered `defer` execution, batches intermediate renders, and reveals the final interface once ready. Private progress checks use the backward-compatible `?since=<revision>` protocol: unchanged responses contain only revision metadata. Edits debounce for 300 ms; visible clients poll every five seconds and check again on focus/visibility/network return. Requests time out after 15 seconds with retry backoff; edits remain saved locally. iOS may suspend a background web app, so these timings are foreground targets rather than a background-sync guarantee.

## Runtime cleanup and cached styles

The assessment catalog now reuses lecture-release scans and caches its result until the event or relevant lesson data changes. Returned catalogs are copied to prevent callers mutating the cache. Legacy `oldDashboard`/`stats`, the retired sidebar-toggle script and unused priority-dropdown styles were removed; teaching/question content and hidden routes remain intact.

Production builds use `scripts/client-styles.mjs` to minify/consolidate linked styles into three content-addressed files while preserving positions around inline overrides. Source styles remain separate for maintenance. `scripts/built-preview.mjs` serves the build locally on port 5174 and forwards API requests only to the local development server on port 5173. Run the visual and performance checks against port 5174 when validating production CSS.

Optional question disclosure state is saved explicitly with the topic draft. Jump navigation ignores closed optional questions and never opens the disclosure itself. Rendering a previously opened disclosure does not generate a new draft write or sync loop.

## Single-request production client

`scripts/client-scripts.mjs` compiles the declared startup scripts in their dependency order into a content-addressed classic script. Global names stay stable for the existing plugins; this is a production build step, while development retains separate source scripts. The canonical lesson payload is included in its original position. No runtime eval, new dependencies, or loading placeholder for missing course data is introduced. Existing source assets remain available for readers and compatibility with older open tabs.

When changing this build step, verify direct startup and route refreshes, compare source/compiled content hashes, and exercise learning, practice, past exams, Anki, and custom tool routes. Browser code combining can expose declaration-order issues even when source-only tests pass. The PWA keeps its original manifest ID/scope but launches `/index.html` directly to avoid the internal root redirect when the browser updates its launch metadata.

## Reliability and incremental reading

`study-reliability-core.js` provides immutable answer-receipt snapshots, WCAG luminance/contrast calculation and isolated in-memory backup round trips. `study-reliability.js` captures new qualifying completed exams/sets (15% minimum), exposes exports and backup checks in Site Settings, and records up to 20 local `studio-ready` timings. Receipts include the displayed choices, selected position, submission key and key fingerprint; historical attempts without receipts are not retroactively represented as verified receipts. Recent receipts sync in the existing options companion store (backward-compatible with older open tabs) with a bounded archive (up to 30; older entries are evicted to keep the archive below approximately 1.8 MB). Export important receipts for long-term retention.

Incoming cloud adoption/reconciliation merges saved data while suppressing active learning/practice/Anki rehydration and redraw. Deferred hydration runs when leaving that section, without restoring a remote device's resume position over an intentional navigation. Answer edits still save normally. Existing cloud ownership, revision checking and R2 snapshot storage remain intact.

The production compiler defers canonical extracted source-page text into content-addressed per-document JSON and the ungraded source-question index into a separate JSON file. Reading requests preserve slide/page metadata, media references, question order and all text. Graded banks, objective mapping and teaching remain available synchronously to preserve mastery calculations and question grouping. Source development and older readers continue using the original full payload. `source-demand.js` handles reading/search loading, shared requests, failures and retries.

`performance-budget.mjs` fails builds exceeding one startup JavaScript request, 7 MiB raw or 1.55 MiB gzip. Budgets are payload regression limits, not an iPhone launch-time guarantee. The Settings performance panel reports the actual current device's latest/median ready timings against a one-second target. New large sources should use incremental reading rather than raising the startup budget silently.

Mobile primary navigation and expanded More tools share one horizontally scrolling bottom dock, including icons, grade/activity/library tools and access to Sync & Settings. The second mobile extras strip is retired.

### Mobile gesture clearance and reading compression

The mobile dock is raised by the device safe-area inset plus 18px, with 105px-wide, 68px-minimum-height labelled targets. Left/right tap controls page the same horizontal scroller; no second extras strip is created. This avoids requiring a swipe at the iOS home-indicator edge; web code does not disable operating-system app-switch gestures. Test the physical iPhone when confirming OS-level gesture behavior.

Deferred reading/source-index assets are now losslessly gzip-compressed in the publisher package. The reader detects gzip magic bytes and uses browser-standard decompression, accepting already HTTP-decoded JSON as well. The build checks byte-for-byte round trips, and regression tests cover both delivery modes. The measured package is approximately 29.8 MiB (rather than 32.4 MiB); the hosting size is not the startup download size.

## Heart lab, private media and learning tools

The initial 3D Anatomy Lab is an adult reference heart with 11 selectable BodyParts3D structures. `public/anatomy-lab.js` integrates Explore, typed labeling with feedback/retry, and a timed practical with early finish/cancel. Model limitations are explicit: atrial walls, combined ventricular wall and ventricular cavity surfaces are different; valves, most veins, separate coronary branches and pericardium are not meshes in this subset. Structure notes link to CVP A4/A5/A6 and their actual source pages. Progress uses `options.anatomy.attempts`, merged by unique ID across devices and counted as recorded practice in the heatmap. It never writes lecture MCQ mastery or review completion. Completed practical scores below 15% are review-only; individual labeling attempts remain learning evidence.

`client/heart-viewer.mjs` uses Three.js 0.187.0, GLTFLoader and OrbitControls. The generated `public/heart-viewer.mjs` is imported only on entering the lab, uses on-demand rendering, caps pixel ratio, disposes GPU resources on exit and supports keyboard rotation/selection. `scripts/build-heart-viewer.mjs` builds it from the pinned official npm package unpacked under ignored `.sites-runtime/heart-lab/three`. The normal production build verifies source/output hashes via `verify-heart-viewer.mjs` and refuses a stale renderer. MIT license and model CC BY 4.0 attribution are included. The model GLB is 2,524,400 bytes, SHA-256 `b80a727d022a4ab07ccfcf15caccc228eaccb6d69ec0e72923324946ac35a946`, from the pinned OrganUI subset commit `c72ce6654ff8e282942f97750d3104f55ef4fc3d` (BodyParts3D 4.0). Upstream model mapping and coverage ledger live in sibling `heart-lab-work/`.

`/api/study-assets` accepts only authenticated, same-origin, checksum-validated STORE-ZIP batches of registered media. `lib/study-asset-registry.ts` is metadata only. Large media lives in the existing BUCKET under `study-assets-v1/<sha>`; no new storage, secrets or database are created. `/api/study-assets/[id]` serves private immutable assets. The heart can bootstrap itself from the pinned, hash-checked upstream GLB into R2; arbitrary proxy URLs are never accepted. `scripts/prepare-study-assets.mjs` prepares 480/960 WebP derivatives from supplied diagram originals and writes content-addressed IDs plus `diagram-variants.js`. Batches are prepared outside the publisher package, at most 160 registered files per ZIP. Import through Site Settings → 3D & diagram resource storage; reruns are idempotent. Check successful upload before claiming responsive variants are live. Original full-resolution sources stay available for zoom; missing variants fall back to originals.

The source reader's build-time inverted index searches deferred canonical pages using a compact compressed index; already-loaded additions/uploads are searched directly. Opening a result fetches only its document. Search previews are explicitly distinguished from full source passages. There is no AI-generated answer in material search.

`reading-tools.js` stores font size, line spacing, reading width and captions in the existing synced options store; Examplify retains its own text controls. Diagram `srcset`/`sizes` is inserted before rendering where possible, with lazy decoding, intrinsic dimensions and full-source zoom links.

Progress sync advertises PATCH support. The client holds the last acknowledged immutable snapshot in memory and sends recursive field-level patches only when materially smaller than a full upload. Arrays are replaced as units. The server applies patches to the same authenticated user's exact revision, validates the reconstructed snapshot and uses existing D1 CAS/R2 storage. Stale revisions return 409; unsupported PATCH falls back to PUT. Older clients remain compatible; no database migration runs. Tests cover malicious paths, stale requests, untouched completion timestamps and edits arriving in flight.

## Independent course labs

`public/labs.js` adds a Lessons / Labs & practicals switch inside Learning, with independent CVP/MOL course catalogs. `lab-curriculum.json` is fetched only on entering Labs. Source originals/figures are registered in the existing private study-asset registry; extracted source readings remain small deferred JSON files. The production source-search index includes those readings without downloading them at startup.

`LabCore` preserves canonical answer indices across deterministic display shuffles. Each topic requires a full-set score of at least85% for earned lab mastery; later attempts cannot revoke it. Completed sets below15% are review-only. `options.practical` stores immutable attempts, permanent mastery, per-topic drafts, last-viewed navigation and per-lab notes. The existing companion-vault merge unions attempts and timestamp-merges independent fields. Lab activity contributes to the activity heatmap, never to lecture review passes or lecture MCQ mastery. Sources use printed pages/slides, or named DOCX sections when there are no stable printed page numbers.

`respiratory-next-data.js` / core / runtime add supplied respiratory lecture material to eight existing lecture IDs. Integration is additive and idempotent and is included in `assembled-learning.mjs` for the lecture changelog. No schedule dates, exam receipts or completed records are migrated.
