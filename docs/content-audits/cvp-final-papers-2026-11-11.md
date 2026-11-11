# CVP final papers and Accurate practice — 2026-11-11

## Completed scope

Read every page of the five supplied originals (148 PDF pages), including all MCQs, written cases and OSPE recalls. Reviewed all 112 extracted image crops in seven contact sheets; excluded covers and decorative material, matched the useful figures to their questions, and masked answer-bearing labels in question views. Exact source files were hash-compared with the existing asset manifests; none of these five full originals was already registered there. Existing partial booklets and the 64-question adapted mock were retained.

| Batch | Recovered MCQs | Written case bundles | OSPE stations |
|---|---:|---:|---:|
| 14 | 30 | 3 | 20 |
| 15 | 52 | 3 | Not supplied |
| 16 | 72 | 3 | 16 |
| 17 | 89 | 3 | 19 |
| 18 | 82 | 2 | 20 |

New IDs use `cvp-final-b{batch}-{section}-{original-number}`. Registration is idempotent. Existing IDs, answers, reviews, earned mastery, database and storage bindings are unchanged. Cases are bundled where source numbering restarts, retaining all supplied subquestions and responses. Normal original-set practice and Examplify share the same canonical answers. Incomplete recalls have not been padded with invented original options; ambiguous, deleted and double keys are ungraded. Known contradictions have explicit notes. A PDF table displaced by page layout was restored to its corresponding prompt.

## Accurate selection

The timed mock's optional Accurate control selects all six green repeat families in the existing reviewed 64-question comparison, plus a variable sample of the thirteen three-batch repeats. Those nineteen candidates have four individually explained options. Remaining slots use the existing explained CVP lesson bank, with broad strata deficits guiding selection. The six green families are mandatory. As of v1.44, all thirteen K categories also require four questions each, so the minimum is 52; see cvp-exam-analysis-2026-11-12.md for the updated selection method. Existing ordinary custom lesson mixes remain available when Accurate is off.

The provisional 325-MCQ mapping classifies 324 questions: anatomy 72, embryology 42, histology 39, cardiac physiology 81, pulmonary physiology 90; one unknown is omitted. These are approximate weights from incomplete student reconstructions, not official exam proportions, validated lecture yield, recurrence probabilities or exam predictions. Mandatory repeats take precedence over proportions. All selected questions and choices are shuffled by the existing tested exam engine.

## Remaining source limits

- 14th paper supplies 30 of 85 MCQs; 18th supplies 82 of 90; 17th supplies 19 of 20 OSPE stations.
- Some recalled stations lack their original image/audio or pin mapping. They are explicitly labelled incomplete self-check recalls; no original station media was invented.
- Full PDFs remain in the user's Downloads. They were not falsely represented as uploaded private cloud originals and no broken download links were added. Only focused question figures are published; large originals stay out of the publisher package.
- The supplied printed keys are student reconstructions and can contain errors. Original mode does not claim comprehensive medical validation. Accurate mode uses the separately reviewed candidates and existing explained bank.

## Integration and verification

- Deferred paper and Accurate modules keep the new question content out of startup JavaScript.
- Fixed hydration rejecting valid saved attempts before deferred CVP papers load; regression covers keeping the canonical selected answer.
- Source citations retain original page numbers and hashes below.
- 62 focused regression tests and 12 isolated browser checks passed; the production build passed its startup payload budget. Local isolated desktop/mobile browser checks and focused automated tests are recorded in `.sites-runtime/cvp-papers-smoke/` and the publication work log. No production progress was used for testing.

## Source provenance

- 16th Batch CVP 112 Final.pdf — 29 pages; SHA-256 `3fd65dc1dba698df8d54b2e65de6ee19f33e5ef592e56ff9e9bcfa6bde2f787a`.
- 18th Batch CVP Final.pdf — 36 pages; SHA-256 `2fe3b8ff60a5be0cf2637279040461b1f1f584ee68d587ba5ba437f316af7742`.
- 17th CVP Final Exam.pdf — 53 pages; SHA-256 `6902ae2a4281207d6af059855410421e24839e24e0f856d96e8db81c2d3109aa`.
- CVP Final 15th Batch.pdf — 16 pages; SHA-256 `db0faf3fc789c6efa4808f519337af3ceb26769ebfcbadfc28acafdbd3c5123a`.
- CVP Final 14th Batch.pdf — 14 pages; SHA-256 `194d7168702a002e14aa120f11a115abe0158c1f8505f09fb23d3bab735f04f1`.
