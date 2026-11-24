# Audit 4 — REN 123 library manifest

Baseline: cloudflare-staging. Source inventory unchanged; mappings come only from the existing renal-materials.json sessions. No new source pages or teaching content inferred.

| ID | Evidence | Remedy |
|---|---|---|
| RL-01 | Manifest processing appends source rows before validating later rows; failure leaves a partial catalogue | Build and validate the full list before publishing |
| RL-02 | Initial URL set is not updated during iteration, admitting duplicate URLs within a manifest | Reject repeated manifest paths |
| RL-03 | Repeated manifest IDs or collisions with existing canonical source IDs create ambiguous source lookup | Reject repeated IDs and preserve existing canonical IDs |
| RL-04 | Non-object rows, invalid path shapes and malformed fields reach source construction | Validate manifest and relative REN material paths before constructing sources |
| RL-05 | Manifest session mappings are discarded and generic lecture kind is not eligible for original lecture actions | Retain stable mapped IDs and original-lecture category; do not invent page ranges |
| RL-06 | A stalled manifest request can leave the course library permanently loading | Apply a 15-second request deadline and preserve retry path |

Tests: tests/cloudflare-staging-audit4-renal-library.test.mjs. Candidate CI and hosted checks required.
