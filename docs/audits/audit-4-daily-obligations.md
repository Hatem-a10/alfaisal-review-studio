# Audit 4 — daily obligations

| ID | Evidence | Remedy |
|---|---|---|
| DO-01 | Nonfinite, negative or fractional counters can display misleading completion bands | Validate count domain and return unknown |
| DO-02 | Snapshot task filtering assumes an array of nonnull objects | Guard task shapes and IDs |
| DO-03 | Last duplicate task overwrites earlier completed evidence | Deduplicate by identity and keep earliest valid completion |
| DO-04 | Malformed or mismatched baseline can display a false rest day | Return unknown for malformed baseline/date |
| DO-05 | Coerced or impossible calendar values can become historical completion evidence | Validate timestamps before comparison |
| DO-06 | String comparison of offset-bearing timestamps misorders current and historical snapshots | Compare parsed timestamps |
| DO-07 | Historical merge rescans all tasks for each obligation | Index completion evidence once per merge |
| DO-08 | Invalid incoming date keys or malformed baselines can replace history | Reject invalid incoming records |

Six behavioral regression tests. No live data or academic changes.
