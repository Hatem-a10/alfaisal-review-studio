# Audit 4 — Renal histology selection

| ID | Evidence | Remedy |
|---|---|---|
| RH-01 | Histology selector dereferences malformed station collections, figure rows and marking parts, and accepts pages outside the approved booklet | Validate collection, source page, figure and part shapes before display |
| RH-02 | Repeated station IDs create duplicate figure practice entries | Keep first valid station per original ID |
| RH-03 | Stale figure navigation or reveal callback can skip a station, exceed array bounds or reveal the wrong answer | Bound movement and bind callbacks to current station and connected host |

Three synthetic regression tests. Approved source figures and printed keys unchanged.
