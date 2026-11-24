# Audit 4 — academic group editor

| ID | Evidence | Remedy |
|---|---|---|
| AG-01 | Group text parser silently discards extra colon or comma components | Reject ambiguous rows before sending a save |
| AG-02 | Empty lab segments are silently removed, masking an incomplete entry | Validate each explicit lab token |
| AG-03 | Server accepts group or section codes unsupported by student assignment UI | Align server validator with verified class/section domain |
| AG-04 | Overlapping group loads/saves can overwrite configuration in request order rather than user order | Serialize operations and disable both actions |
| AG-05 | Response can overwrite group editor changes made while the request was pending | Compare submitted draft before replacing text |
| AG-06 | Malformed successful group response may partially alter editor or fail without preserving its draft | Validate complete response before rendering |

Three behavioral regression tests. No live academic configuration writes or production deployment.
