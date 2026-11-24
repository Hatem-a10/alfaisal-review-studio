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
| RM-03 | Responsive-image source lookup can match data-src instead of src | Match the actual attribute |
| RM-04 | Invalid variant paths/dimensions can create broken or unsafe responsive markup | Validate variant metadata and only include smaller variants |
| RM-05 | Existing decoding and self-closing tags can produce duplicate or invalid attributes | Replace existing responsive attributes and normalize closing syntax |
| RM-06 | Image with width but no height never receives the missing dimension | Fill each missing dimension independently |
| RM-07 | Failed responsive image leaves an irrelevant sizes attribute | Remove both responsive attributes on fallback |
| RM-08 | Dock ignores the site's explicit reduced-motion setting | Respect both device and site preferences |
| RM-09 | Hidden dock layout can clamp and erase the user's scroll position | Defer clamping while hidden |
| RM-10 | Multiple observer/resize notifications enqueue duplicate layout work | Coalesce animation frames |

18 distinct findings. RM-01 and RM-02 are excluded as overlapping RR-01–03. The responsive image and mobile dock regression suite from #98 is included here. Behavioral regression tests. No actual deduplication, storage cleanup, asset import, or production deployment performed.
