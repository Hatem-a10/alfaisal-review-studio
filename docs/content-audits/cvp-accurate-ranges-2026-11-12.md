# Accurate / realistic mode — v1.45 range correction

The user superseded the v1.44 four-per-category rule with the following approximate question counts. These are practice targets supplied by the user, not a verified official blueprint.

| Category | Minimum | Maximum |
|---|---:|---:|
| K.01 | 7 | 11 |
| K.02 | 13 | 20 |
| K.03 | 2 | 6 |
| K.04 | 1 | 5 |
| K.05 | 3 | 7 |
| K.06 | 7 | 12 |
| K.07 | 2 | 6 |
| K.08 | 2 | 6 |
| K.09 | 18 | 27 |
| K.10 | 14 | 23 |
| K.11 | 1 | 5 |
| K.12 | 5 | 11 |
| K.13 | 1 | 4 |

The counts are applied literally: feasible Accurate exam sizes are 76–143. The practice default is 100; this is a UI default, not an assertion about official exam length. No base length was supplied for proportional scaling, so none is invented. Standard practice retains its existing 1–200 question range.

The pure allocator starts from category minima and apportions the remaining requested questions toward varied in-range targets. It preserves the exact exam size and every category bound. All six mandatory green repeat families count toward those targets; other verified common repeats are preferred, then remaining explained CVP questions fill the allocated places. The previous broad subject distribution remains only a question-selection tie-breaker within each allocated category. Existing post-submission K-category analysis and answer receipts are unchanged.

Verification: all allowed counts 76–143 are covered by allocation tests, and full selection tests exercise 76, 90, 100, 120 and 143 with green-repeat, uniqueness and exact-total assertions. Isolated real-bank browser checks confirm the default 100 and both endpoints, normal results/analysis, no analysis during active exams, and mobile/desktop fit. The v1.45 milestone runs the full automated suite; obsolete library-navigation and lesson-stage test fixtures were updated to reflect the already existing app rather than changing unrelated production behavior.

Milestone results: 235 automated tests passed; 47 desktop/tablet/mobile layout checks passed; seven focused real-bank exam-flow checks passed. The build passed its unchanged startup budget. Test fixtures now load the real material-link/dedup dependencies, exercise the current list library, and test expansion-stage idempotence in runtime order without mutating the globally assembled teaching fixtures.
