# Full-suite repair audit — 17 November 2026

Scope: cloudflare-staging only. No original test was deleted, skipped or disabled. Original baseline361 tests:346 passing,15 failing. Final local suite369/369 passing (eight added regressions). Runtime question banks, choices, scoring keys and saved user data are unchanged.

## Each of the 15 original failures

| # | Test / location | Exact cause and resolution |
| --- | --- | --- |
| 1 | client-scripts: ordered shared globals | Fixture used old executable defer/src tags; optimizer consumes inert application/x-review-studio data-src tags. Updated fixture and executed optimized JS in a VM to verify order, globals and Unicode; source-byte preservation assertions retained. |
| 2 | client-scripts: lesson dependency position | Same obsolete fixture bypassed optimization. Current tags now exercise /api/lesson-data → learning-data.js mapping in dependency position; API preload must disappear and consumer must read the correct answer. |
| 3 | client-scripts: cleanup | Old tags meant no bundled candidate list, so removedFiles was undefined. Current fixture verifies exact removed count/bytes and retains scripts needed by independent pages plus lazy modules. |
| 4 | cvp19-booklet: Accurate category ranges | Assertion imposed obsolete hard K limits. Replaced with 20–200 request size, uniqueness, all required repeat IDs, 10–16 actual question images and valid editorial category coverage. |
| 5 | exam-analysis: Accurate bounds | Expected76–143 instead of approved20–200. Tests now exercise20/76/100/143/200 and reject19/201; six mandatory families and real image quota remain enforced. |
| 6 | exam-analysis: allocation | Expected randomized bounded integer quotas. Current allocator returns proportional soft targets. Test verifies total weights, larger respiratory preferences and targets beyond old bounds; missing categories do not make a feasible exam fail. |
| 7 | exam-analysis: permitted sources | Obsolete static regex expected booklet/past-paper-only code. Added behavioral source-toggle checks for booklet, previous papers, Shams, Olena/Vlad and Batch19 TBL; excludes unverified concept, old TBL and wrong-course items. Runtime/source data unchanged. |
| 8 | phase2-exam: colliding mandatory family | Correct rejection already happened; error text changed from Mandatory to Required. Updated expected wording while retaining assertion that collision throws. |
| 9 | precision-navigation: catalog visibility | Expected unlabeled and corrected-booklet MCQ entries under older catalog rules. Now verifies hiding them, separate CVP/MOL filters, classification and input immutability. |
| 10 | startup-sync: unchanged poll then dirty upload | VM lacked window. The successful unchanged response reached window.ReviewDevice, raised ReferenceError and was caught as a sync failure, imposing backoff; the next request never reached PUT. Browser-shaped global object and async device adapter restore the actual GET→GET→PUT sequence and final revision/clean-state assertions. No ordinary sync algorithm change needed. |
| 11 | startup-sync: startup readiness | Expected all startup scripts to be defer/src. Now verifies inert manifest order, last startup-ready entry and sequential device-hydrated loading, then executes startup-ready to test awaited runtime/render and visible failure recovery. |
| 12 | startup-sync: repair merge/upload | Missing window prevented execution; old assertion also expected a retired large localStorage backup. Browser VM and device recovery spy now execute verified backup, merge and revision-checked upload; assert recovery copy via the current device adapter. |
| 13 | startup-sync: repair CAS retry | Same missing browser environment. Test now actually exercises409, fresh remote state, uploads at revisions8 then9, and confirmed revision10. |
| 14 | startup-sync: mismatched/offline repair | Missing window intercepted expected account/offline failures. Test now reaches account mismatch and failed upload, retains recovery copies and dirty local changes. |
| 15 | startup-sync: cancelled response | Missing window prevented repair. Original delayed old request now completes after a successful repair and cannot replace confirmed revision9 with stale revision99. |

## Real defects discovered during the investigation

1. Source HTML device bootstrap marked migration initialized before all IndexedDB value writes. The production optimizer already substitutes the correct canonical adapter, but direct-source preview could skip a partial migration after a failed write. Inline source now exactly matches public/device-storage.js. Tests execute the real adapter with asynchronous transaction failure injection: failed migration stays retryable, originals survive, successful retry restores data, verified recovery persists, and confirmed cleanup retains the durable copy.
2. Repair Sync did not recheck the local bound account after awaiting its device backup. A new failing regression demonstrated old-account reconciliation after a switch. Repair now checks bound identity after backup/fetch/JSON waits and around upload attempts. It stops without merging or network access when the account changes during backup. Existing remote identity, revision/CAS, cancellation and local copy protections remain active.

## Added regressions (eight)

- Verified-source toggle behavior, including Batch19 TBL and course isolation.
- Recovery backup verification failure stops before network access.
- Exact pre-merge progress/preferences/Anki companion data retained; upload preserves existing records.
- Account switch while backup is pending stops repair.
- Failed IndexedDB migration remains retryable and preserves source data.
- Verified recovery storage and cleanup only after confirmation.
- Failed recovery transaction rejects without losing readable progress.
- Source/canonical bootstrap parity.

## Verification

- Full local Node suite:369 passed,0 failed,0 skipped,0 cancelled. All361 existing tests remain.
- Production build: passed (local build only; no Sites publication).
- Cloudflare staging build: independently checked before push.
- vinext check: exits0;2/2 Next imports and5/5 recognized libraries supported. Existing CommonJS warnings are in browser-only MathJax/sql-wasm vendor assets, not server imports.
- CI no longer uses continue-on-error for the full suite. Any regression fails the GitHub job; logs remain available as artifacts.
- Live deployment confirmation and CI results are available in the commit's GitHub check runs and local ignored repair receipt; code push alone is not deployment evidence.

Terra reviewed exam/catalog assertions; Luna reviewed bundler fixtures and bootstrap parity; root reviewed integration and repaired sync harness/identity guards, added durable-storage tests, and ran the complete checks. Synthetic data only.
