# Audit 4 — repair and diagram controls

| ID | Evidence | Remedy |
|---|---|---|
| RV-01 | Fractional minimum-question requirement creates an impossible fractional threshold | Normalize to integral range |
| RV-02 | Repair lookup can select hidden lessons or questions | Validate current visibility and topic presence |
| RV-03 | Unresolved repair request clears existing repair set before lookup succeeds | Defer clearing until successful navigation |
| RV-04 | Stale repair draft dereferences missing lesson or invalid topic | Guard retest selection |
| RV-05 | Retest pool includes invalid or repeated question rows | Require usable unique questions |
| RV-06 | Retest may start while another lesson is selected | Confirm lesson navigation and restore topic |
| RV-07 | Missing topic group throws during weak-topic listing | Treat absent group as empty |
| RV-08 | Next repair excludes different topics with identical titles | Compare lesson and topic identity |
| RV-09 | Empty eligible wrong-question selection replaces existing practice draft | Reject empty set and persist valid draft |
| RV-10 | Zero-size image rectangle creates nonfinite pointer coordinates | Reject zero-size rectangle |
| RV-11 | Unrelated pointer completion or detached figure commits stale mask | Bind draw to pointer and figure identity |
| RV-12 | Mask save trusts coordinates and meaningless label text | Validate dimensions, bounds and label |
| RV-13 | Adding mask above limit silently discards the new exercise | Reject with explicit capacity message |
| RV-14 | Blank answer can match empty normalized label alternative | Require meaningful normalized answer |

Six synthetic regression tests. No stored exercises or progress deleted.
