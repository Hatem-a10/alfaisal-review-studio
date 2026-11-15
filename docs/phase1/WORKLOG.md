# Road to v1.50 — Phase 1 local checkpoint

Display: **v1.497**. Native published provenance remains version **150 / v1.495**. Phase 2 is v1.498; only Phase 3 may publish v1.50. No source push, native save/deploy, replacement Site, audience change, database migration or production write occurred.

Active checkout remains `outputs/review-tracker`, baseline `ec69b79a39618aa4fbf4b51aa0f109547a10aee0`. Read AGENTS.md, docs/DEPLOYMENT.md and the installed Sites workflow. `.openai/hosting.json` and DB/BUCKET bindings remain untouched. Native read-only inspection found `review_academic_groups` empty, with columns class_code/group_code/configuration. No student rows were read.

## Implementation

1. Version: badge + site-release.json use v1.497/local-draft; retain published native provenance.
2. Two themes: saved `light`/`amoled` choices retained; labels Light Mode/Dark Mode. No third theme.
3. Contrast/layout: final CSS layer strengthens light surfaces, input/button edges, secondary text, focus and selection. Seven responsive widths in both themes; tablet lesson list overlap repaired. Touch targets and reduced motion supported.
4. Accents: pure derived semantic tokens, checked across 216 RGB combinations in both themes, preserve stored custom color, adapt automatically on theme changes. Includes readable foreground, text, tinted selection, hover, border and ring compatibility tokens.
5. Copy: exact whitelist removes five redundant welcome/appearance/Learn/Library/Anki subtitles. Retain source/key warnings, counts, grading/timing assumptions, sync/account errors and educational text.
6. Reading: corrected legacy-specificity overrides; text size/spacing/width now visibly affect lesson and question content. Higher reading contrast and reduced motion persist in per-account StudyVault options. Original Examplify/Anki card controls remain independent.
7. iPhone picker: Settings explicitly autofocuses its close button; color input is activated only by a deliberate user action. Browser emulation verifies focus isolation; actual iOS/WebKit still needs device QA.
8. Sync: hide redundant device-saved row but retain status/error nodes; visible compact actions. Repair verifies a durable, account-bound local recovery copy, cancels stale requests by epoch, does full authenticated reconciliation, checks account identity, retries CAS conflicts and confirms upload before success. Failure retains all copies and reports actionable feedback.
9. Onboarding: six concise steps, progress indicators and Back/Next; optional verified lab list, two/three-day English preference, prior independent review passes, daily study budget. Only new accounts get forward dates anchored to Riyadh onboarding date. Existing/legacy accounts bypass setup; new fields can be set optionally in Settings. No progress is awarded by merely viewing an objective.
10. Academic configuration: authenticated read + server-owner-only configuration form/API; only verified M1-A/1.6 fallback. No fabricated group codes or class/English timetable. Existing private student material routes remain per-user. Shared curriculum mutation routes now also require server owner authorization, independently of the remembered client Admin Settings phrase.
11. Quick search: Cmd/Ctrl+K or icon; lazy complete objective/booklet loading, deduplicated lecture/objective/question/material index, keyboard arrows/Enter/Escape, direct objective/question navigation. No answer keys or priority metadata indexed. Disabled during active Examplify exams.
12. Score Needed: course-specific target percentage or user-supplied letter boundaries; exact weighted remaining requirement, secured/impossible states and independently explained per-assessment raw minima. Display minima round upward rather than understate requirements. Existing stored assessment weights/marks are never changed.

## Ownership / modified files

- Terra logic: app.js, profile-entry.js, student-profile.mjs, onboarding-plan.mjs, grade-solver.mjs, reading-tools.js, progress API validation, site-release.json; synthetic profile/planning/sync/solver tests.
- Luna visual: phase1-ui.css, phase1-accent.mjs, phase1-copy.mjs, admin-panel.js; contrast/copy/focus tests.
- Terra config: academic-config API/helper and synthetic config tests; existing storage test harnesses now exercise real owner authorization with synthetic identities.
- Root integration: phase1-runtime/search/academic-admin modules, startup-ready.js, index.html, learning.js labels, shared-upload-owner helper and shared POST guards, lazy Cvp19/objective loader hooks, study-autopilot merge success/failure propagation, responsive/browser checks and final QA.

See `git diff --stat` and `git ls-files --others --exclude-standard` for exact files. Generated browser evidence is ignored under `.sites-runtime/phase1-smoke/`.

## Verification

- **82 targeted automated tests pass**: phase1-* plus startup-sync, student-profile, private-media, study-assets, answer-integrity, hub-upgrade and lesson-expansion.
- **154 browser checks pass**, zero browser exceptions: 390, 600, 768, 820, 1024, 1180 and 1440px, both themes. Includes Dashboard, Learning, Schedule, Practice, Library, Grades, Countdowns, Activity, Anki, Settings; reading scale/persistence; search keyboard/index; six-step neutral onboarding; unknown lab filtering; safe picker focus.
- Build passes with unchanged startup budget: raw 7 MiB / gzip 1.55 MiB / one classic bundle. Reading/resource controls are loaded separately instead of increasing the cap.
- New Phase 1 modules/tests lint clean (0 errors / 0 warnings). Full repository lint remains blocked by **127 pre-existing errors** and roughly 7,000 warnings; changed-file baseline comparison found **no introduced diagnostics**. Do not report full lint as passing.
- `git diff --check` passes. No production data, authenticated browser profile or live student account was used for tests.

Commands use the bundled Node at `/Users/hatemalabrach/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`:

```
node --test tests/phase1-*.test.mjs tests/startup-sync.test.mjs tests/student-profile.test.mjs tests/private-media.test.mjs tests/study-assets.test.mjs tests/answer-integrity.test.mjs tests/hub-upgrade.test.mjs tests/lesson-expansion.test.mjs
node scripts/run-framework.mjs build
node scripts/phase1-smoke.mjs http://127.0.0.1:5174/
```

Browser test uses an isolated temporary Brave profile, local APIs and exact local fixtures for the two offloaded lesson JSON files. It never weakens production authentication.

## Explicit limitations / Phase 2 & 3 handoff

- Unknown class/lab/English days and times cannot constrain the plan until verified schedules are supplied/configured. Frequency is saved, never converted into guessed commitments. The planner uses verified academic breaks, known future finals, personal blocked dates and budget.
- If all remaining reviews cannot fit before a final, the three-date legacy record schema needs valid placeholders. Those specific reviews use onboarding day placeholders, not back-dated overdue dates; a durable synced Settings warning identifies every unplaced pass and explains manual adjustment. This is not a claim that an impossible workload was fitted. Future phase may add a first-class unscheduled state.
- Before **any Phase 3 deployment**, securely configure `REVIEW_STUDIO_OWNER_ACCOUNT_KEY` using the verified app-authenticated owner identity (SHA-256 of `review-studio:` + authenticated ID). No editable profile field/client password can authorize server writes. Until configured, shared uploads and academic-config writes fail closed; personal progress/material uploads are unaffected. Verify existing D1 academic table insert constraints locally before a real configuration write.
- Actual Safari/iPhone/iPad testing, real multi-account cloud acceptance and production publishing are intentionally deferred. Browser emulation is not physical device verification.
- Resolve baseline lint debt separately; do not suppress it globally.

**Next:** begin Phase 2 locally at v1.498. Preserve these files, tests, account safeguards and unresolved factual constraints. Do not deploy before Phase 3 authorization/work is complete.

## Exact modified/new files at this checkpoint

- `AGENTS.md`
- `app/api/academic-config/route.ts`
- `app/api/admin-assets/import/route.ts`
- `app/api/admin-assets/report/route.ts`
- `app/api/private-media/route.ts`
- `app/api/progress/route.ts`
- `app/api/study-assets/route.ts`
- `docs/phase1/WORKLOG.md`
- `lib/academic-config.mjs`
- `lib/shared-upload-owner.ts`
- `public/admin-panel.js`
- `public/app.js`
- `public/cvp19-entry.js`
- `public/grade-solver.mjs`
- `public/index.html`
- `public/learning.js`
- `public/onboarding-plan.mjs`
- `public/phase1-academic-admin.mjs`
- `public/phase1-accent.mjs`
- `public/phase1-copy.mjs`
- `public/phase1-runtime.mjs`
- `public/phase1-search.mjs`
- `public/phase1-ui.css`
- `public/profile-entry.js`
- `public/reading-tools.js`
- `public/site-release.json`
- `public/startup-ready.js`
- `public/student-profile.mjs`
- `public/study-autopilot.js`
- `public/supplemental-objectives.js`
- `scripts/phase1-smoke.mjs`
- `tests/phase1-academic-config.test.mjs`
- `tests/phase1-accent.test.mjs`
- `tests/phase1-copy.test.mjs`
- `tests/phase1-logic.test.mjs`
- `tests/phase1-owner-uploads.test.mjs`
- `tests/phase1-search.test.mjs`
- `tests/private-media.test.mjs`
- `tests/startup-sync.test.mjs`
- `tests/study-assets.test.mjs`
