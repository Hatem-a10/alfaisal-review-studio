# Audit 4 — lecture change log UI

| ID | Evidence | Remedy |
|---|---|---|
| CL-01 | Nested malformed change rows can throw during rendering | Validate entire log payload before publishing |
| CL-02 | The all-lecture list includes hidden course history in the active workspace | Filter using current course visibility |
| CL-03 | Malformed upload/candidate collections can crash log generation | Guard shapes and timestamps |
| CL-04 | Duplicate upload rows repeat change history | Deduplicate upload identities |
| CL-05 | Older authorized fetch can be installed after revocation and reauthorization | Invalidate request generation and abort previous fetch |
| CL-06 | Stalled change log request has no deadline | Abort after bounded deadline |
| CL-07 | Failed fetch silently displays no recorded changes | Expose failure and retry, distinguish from valid empty history |
| CL-08 | Obsolete or inaccessible lesson actions remain actionable | Disable absent lessons and recheck visibility on click |

Four behavioral tests. Active/shared runtime only; no archived lecture content changed, no production release.
