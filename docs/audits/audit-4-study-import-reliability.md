# Audit 4 — study/import reliability

Evidence: each row refers to the modified function in the corresponding shared runtime module. These are source-level findings, not claimed live incidents. A4-025–A4-062 are candidate fixes; full CI and staging verification must be recorded independently. No CVP teaching content is changed.

| ID | Area | Finding | Candidate fix |
|---|---|---|---|
| A4-025 | Anki metadata | Fixed-width protobuf fields skip past truncated input | Check remaining byte count |
| A4-026 | Anki metadata | Protobuf tag field zero and out-of-range field numbers are accepted | Validate tag field range |
| A4-027 | Anki metadata | Large varints can exceed exact JavaScript integer precision | Reject non-safe integers |
| A4-028 | Anki media | Per-entry Zstd caps do not bound cumulative decoded media | Apply aggregate decoded-byte budget including collection |
| A4-029 | Anki media | Malformed media index shapes and non-string names reach parser unchecked | Validate index and filename entries |
| A4-030 | Anki media | Missing referenced media files are silently ignored | Retain missing-media warnings |
| A4-031 | Anki media | Special object property names are unsafe in media dictionaries | Use null-prototype media maps |
| A4-032 | Anki scheduler | Unknown rating values silently use Good behavior | Reject unsupported rating |
| A4-033 | Anki scheduler | Invalid prior counters can concatenate strings or become negative | Normalize finite nonnegative counters |
| A4-034 | Anki scheduler | Infinite or impossible review times produce invalid schedule data | Validate timestamp and due date |
| A4-035 | Anki background | An unrecognized storage operation falls through to delete | Validate operation explicitly |
| A4-036 | Anki background | Blocked IndexedDB opens never resolve or reject | Handle blocked opens and close late handle |
| A4-037 | Anki background | Transaction aborts do not reject the background promise | Handle abort and transaction setup failures |
| A4-038 | Anki library | Legacy deck filtering repeatedly scans owned records | Index account-owned deck identities once |
| A4-039 | Anki import | Account can change while package parsing or upload is pending | Capture and recheck original account before writes |
| A4-040 | Anki background | Late background read can update a different account's visual state | Compare captured account before applying |
| A4-041 | Anki ratings | An asynchronous rating can be applied after switching deck or card | Check captured deck, account and index |
| A4-042 | Anki storage | Unknown deck operation falls through to delete | Validate operation before opening storage |
| A4-043 | Anki storage | Aborted local-deck transaction can leave loading pending | Reject abort |
| A4-044 | Receipts | Invalid selected option index enters scored denominator | Accept only valid choice indices |
| A4-045 | Receipts | Out-of-range answer key is treated as graded | Mark invalid keys ungraded |
| A4-046 | Receipts | Displayed letters array is not frozen with submitted receipt | Copy displayed letters |
| A4-047 | Receipts | Validation does not reconcile stored score with receipt rows | Recompute keyed, scored, correct, percentage |
| A4-048 | Analytics | Repeated lecture IDs increment same lecture totals twice | Deduplicate lecture membership |
| A4-049 | Analytics | Duplicate saved attempt IDs can be counted more than once | Track already counted runs |
| A4-050 | Analytics | Out-of-range answers and keys enter graded counts | Validate answer and key ranges |
| A4-051 | Mock history | Numeric timestamps from exam creation sort incorrectly through Date.parse | Handle numeric and string timestamps |
| A4-052 | Mock history | Newer unfinished copy can replace finished run and visible snapshot | Prefer submitted run; align snapshot |
| A4-053 | Mock history | Legacy attempt without ID is dropped during merge | Retain legacy identity from attempt contents |
| A4-054 | Mock history | Invalid date crashes mock name formatting | Show date unavailable |
| A4-055 | Booklet | Fractional persisted position selects no array element | Truncate and clamp position |
| A4-056 | Grade solver | Blank or null completed marks silently count as zero | Require explicit numeric completed marks |
| A4-057 | Grade solver | Repeated assessment ID can count same assessment twice | Reject duplicate IDs |
| A4-058 | Grade solver | Boolean input silently coerces to target percentage | Require number or string |
| A4-059 | Grade solver | Floating arithmetic can mislabel a secured grade | Use same comparison tolerance as impossible status |
| A4-060 | Figure zoom | Tiny viewport can create negative fit scale | Bound fit scale |
| A4-061 | Figure zoom | Failed image load shows no useful feedback | Display loading and failure status |
| A4-062 | Figure zoom | Dialog close retains prior figure source and repeated open can throw | Clear source on close and guard open |

Regression file: `tests/cloudflare-staging-audit4-study-import.test.mjs`. Existing Anki real-package, receipt and mock-history tests continue to run.
