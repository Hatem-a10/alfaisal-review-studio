# Road to v1.50 — Phase 2 local handoff

**Display: v1.498. Local draft only.** Native published provenance remains version 150 / v1.495. No source push, Site save/deploy, replacement project, audience change, D1 migration or production write occurred. Continue with Phase 3 before applying v1.50 or publishing.

The active checkout is still `outputs/review-tracker`. Phase 1 work and its account/storage safeguards remain present. `.openai/hosting.json`, project identity and DB/BUCKET bindings are unchanged. Test accounts, browser storage and API fixtures were synthetic and isolated; no real student progress was used.

## Feature report

| Requested item | Implementation |
| --- | --- |
| Version | Source badge and release metadata display v1.498; published/native provenance retained. |
| Practice default | Timed Mock is first; fresh navigation selects it, while an active original or mock remains intact. Existing modes plus Booklet, Previous Mocks and Weak Areas share one navigation bar. |
| Examplify parity | Filled blue navigator selection, persistent eye control beside the selected checkmark, unselectable option text, functional highlight/partial erasure and selection cleanup. Outer scrollbar removed; internal panes still scroll. Light exam theme retained alongside charcoal dark presentation. |
| Cheat Mode | Per-attempt persisted flag. Add Time removed. Pause checkbox appears beside Add Alarm under Tools; View Answer is a small corner control. Both and the answer panel disappear in strict mode. Missing legacy flags default to strict and cannot leave a hidden paused timer. |
| Timers/telemetry | Pause survives serialization and shifts the deadline on resume. Both classic and Examplify mocks track foreground question time, excluding pause. Results show average active seconds, slowest questions, Right → Wrong switch counts/list and a collapsible per-question table. Existing debrief timing also excludes pause. |
| Keyboard | A–E / 1–5, F, arrows and appropriate Enter actions in supported MCQ views; compact shortcut help. Inputs, editable controls and modal dialogs suppress shortcuts. Submission keeps existing confirmation/restriction behavior. |
| Booklet | All 1,214 corrected-source entries available sequentially, including non-MCQs; filters, drafts, completion and position persist per student. Checked MCQs show keyed choice(s), incorrect selections and supplied option reasons. Written items reveal source answers and require explicit self-assessment or ungraded completion. |
| Previous Mocks | Frozen question/option/key snapshots, Riyadh timestamp names, separate retry IDs and retained attempts/scores. Ordinary users retain five parent mocks with pruning tombstones; server-verified Admin has no application count cap. Legacy etHistory is not deleted. |
| Weak areas/quality | Lecture and discipline accuracy from eligible mock attempts and graded booklet work; concise default-dashboard preview plus one-click weighted practice using weak lectures and Wrong Bank. Shared canonical/near-duplicate checks apply to ordinary, weak and Accurate selection. Accurate keeps all hard category, image and mandatory-family constraints. |
| Figures/Wrong Bank | Full available figure source retained, aspect ratio preserved, closeable native Examplify lightbox with Fit/zoom; existing non-exam viewer remains. Clear Unanswered removes only unanswered entries. A synced tombstone prevents old unanswered entries returning while retaining actual wrong answers. |
| Other/heatmap | Study Activity is first/default in Other on desktop/mobile; explicit tool selection remains respected. Completion uses required daily obligations only. Exact six requested bands, neutral rest days, unknown missing history, numeric accessible descriptions and tap details. Historical baselines are merged without rebuilding them from later schedule edits. |
| Coverage audit | Report only; no invented questions. See ../phase2-practice-audit.md and ../phase2-practice-coverage.json. |

## Exact coverage findings

- Broad ordinary pool: **4,118 eligible questions; all 79 lectures mapped**.
- Ordinary exam-source pool: **2,147 eligible questions; no eligible mapped questions for MOL-23 Alternative Pathway of Carbohydrate Metabolism, MOL-24 Alcohol Metabolism, MOL-25 Vitamins Part I, MOL-26 Vitamins Part II**. Their concept checks remain available in the broader pool; the narrower source-kind filter excludes them.
- Accurate CVP: **1,069 eligible questions across 51 configured CVP lectures; no eligible mapped question for CVP-A23 Clinical Embryology / Review** under the permitted-source/category filters.
- Eligibility is not a promise that a particular generated exam includes every lecture. Account uploads can change the ordinary pool. The audit did not alter content or weaken filters.

## Implementation ownership and files

- Terra exam: `public/exam-engine.js`, `exam-tools.js`, `examplify-mode.js`, `cvp-accurate-engine.mjs`, and `tests/phase2-exam.test.mjs`.
- Terra practice: `public/phase2-practice.mjs`, `phase2-practice-core.mjs`, `phase2-question-quality.mjs`, `phase2-practice-audit.mjs`, practice tests and coverage report.
- Luna: `public/phase2-ui.css`, reference-photo comparison and responsive component styling.
- Root integration: `public/phase2-runtime.mjs`, `phase2-daily.mjs`, `phase2-bank.mjs`, `phase2-pacing.mjs`, `phase2-image-zoom.mjs`, `/api/capabilities`, source versioning, navigation ordering, StudyVault merge hooks, wrong-bank hydration/tombstones, lazy feature loading, Admin-capability race protection, legacy debrief pause handling and final visual QA.
- Existing integration files also changed: `public/index.html`, `site-release.json`, `phase1-runtime.mjs`, `studio-navigation.js`, `mobile-dock.js`, `original-exams.js`, `wrong-bank.js`, `study-workflows.js`, `study-vault.js`, `study-insights.js`, `tests/exam-profile-ui.test.mjs`, `AGENTS.md`.
- New tests/scripts: `tests/phase2-{exam,practice,daily,cloud,pacing-bank}.test.mjs`, `scripts/phase2-smoke.mjs`.

## Verification

- **141 automated tests pass**, including Phase 1 preservation, Phase 2 helpers, cloud merges, original answer integrity, booklet inventory/migration, Accurate bounds at 76/100/120/143, mandatory families and source restrictions.
- **44 browser checks pass with zero browser exceptions**, including active Examplify at phone, tablet and desktop sizes. Browser verification uses an isolated temporary Brave profile against the built local site, synthetic state and exact fixtures for offloaded lesson JSON. Detailed results and screenshots are retained in `.sites-runtime/phase2-smoke/`.
- The actual assembled-bank 100-question Accurate sample passed all category bounds, contained all six mandatory families, met the 10–16 image quota and had no duplicate selected family.
- Build passes without raising the startup budget: **7,236,751 raw bytes / 1,622,458 gzip bytes**, one classic bundle. Optional debrief/navigation features load separately; independent imports load in parallel.
- New Phase 2 modules/tests lint clean. Full repository lint still reports **127 pre-existing errors / approximately 7,000 warnings**; it is not reported as a clean lint run.
- TypeScript still reports the two existing private-media type errors (`R2ListOptions.include`, unknown BodyInit). No new TypeScript errors were reported.
- `git diff --check` passes.
- Three old UI tests were updated for the explicitly requested six-step wizard and conditional Cheat Mode reveal. Strict-mode answer-leak and progress-preservation guards remain.

## Remaining constraints before Phase 3

1. Preserve the Phase 1 prerequisite: securely provision and verify `REVIEW_STUDIO_OWNER_ACCOUNT_KEY` before production publication. Shared uploads/academic configuration fail closed without it; Admin history privileges use server verification, not the client Admin Settings phrase.
2. Unknown Admin capability never destructively prunes history. When the server confirms ordinary status, the five-parent cap is applied with tombstones, including cross-device unions. Pending verification can temporarily retain more items to protect data.
3. Admin has no application item-count cap, but existing snapshot/account byte limits still apply; the UI reports storage failures instead of dropping progress silently.
4. Historical schedule baselines start prospectively. Days without a trustworthy saved denominator remain unknown even if some study activity exists; no retrospective percentages were invented.
5. Images use the full available source. Zoom cannot recover anatomical detail absent from a blurry original; no fabricated detail or misleading enhancement was introduced.
6. Accurate generation uses a conservative similarity check and bounded retries; it reports unsatisfied constraints rather than relaxing the blueprint. A bounded search is not a proof that every mathematically feasible combination will be found.
7. Physical iPhone/iPad/Safari and authenticated multi-device production acceptance remain for Phase 3. Local emulation is not physical-device or deployment verification.

**Next:** Phase 3 at v1.50, with its requested scope, final regression checks and authenticated native publication only when authorized. Do not reset or replace existing production identity, bindings, access settings or student data.
