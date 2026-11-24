# Audit 4 — reading and resource controls

| ID | Evidence | Remedy |
|---|---|---|
| RR-01 | Arbitrary stored font/spacing values leave no selected item in the corresponding select | Normalize to actual supported control options |
| RR-02 | Nonfinite or coercible numeric preference values produce misleading choices | Validate numeric values before normalization |
| RR-03 | Unrecognized dataset keys can write into reading preference schema | Allow only known setting keys and validate checkbox values |
| RR-04 | Missing settings/admin hosts cause shared reading initialization to throw | Tolerate absent optional hosts |
| RR-05 | Duplicate-cleanup cursor can repeat indefinitely or move backward on malformed response | Verify pagination advances or terminates |
| RR-06 | Invalid cleanup response counters can concatenate strings or show misleading reclaimed totals | Require bounded integral response counters |
| RR-07 | Reentrant cleanup or resource upload can issue duplicate requests | Guard disabled controls |
| RR-08 | Oversized archive is uploaded before client notices the server limit | Reject before transfer |
| RR-09 | Resource import reports success without validating verification flag/count | Require verified successful response |
| RR-10 | Interrupted operations omit already confirmed partial progress | Report confirmed counts on failure |

Five regression tests. No actual deduplication, storage cleanup, asset import, or production deployment performed.
