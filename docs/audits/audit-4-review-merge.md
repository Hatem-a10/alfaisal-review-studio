# Audit 4 — review merge clocks and planner undo

| ID | Evidence | Remedy |
|---|---|---|
| RC-01 | Field change detection treats reordering of object keys as a real edit | Compare values structurally |
| RC-02 | Evidence timestamp aggregation spreads potentially large histories and dereferences malformed rows | Iterate guarded rows and require actual timestamp strings |
| RC-03 | Date merge fills an explicit empty Renal schedule from older dates | Resolve transitions between scheduled and unscheduled arrays atomically |
| RC-04 | A clocked completion removal can resurrect the other device's earlier completion | Preserve explicit clear as null |
| RC-05 | Removed clocked ordinary record field remains in merge-base result | Respect intentional field deletion; preserve sole unclocked legacy value |
| RC-06 | Settings global save timestamp competes with explicit field clock and can undo a more recent actual setting change | Give explicit field clock precedence |
| RC-07 | Settings merge can drop a sole remote value when its snapshot is older | Preserve the only existing unclocked value |
| RC-08 | Initial assessment spread bypasses disabled automatic planning or same-day undo | Gate automatic spread while retaining explicit rebalance request |
| RC-09 | Planner undo accepts unknown course IDs, arbitrary fields, malformed date indices, and can overwrite dates of completed reviews | Validate visible catalog identity, whitelisted fields, date shapes and unfinished pass |

Six regression tests, no live record migrations, archive content edits or production deployment.
