# Audit 4 — workspace navigation

| ID | Evidence | Remedy |
|---|---|---|
| WN-01 | Non-string workspace route throws during parsing | Reject malformed input |
| WN-02 | Trailing empty archive route component is accepted as archive index | Require exact index path |
| WN-03 | Malformed session rows or kinds can throw in session filtering | Validate input collections and row title |
| WN-04 | Delimiter-concatenated session title/detail can collide | Use structured tuple identity |
| WN-05 | String lecture association or malformed reference collection can hide archived identity or throw | Read scalar legacy associations and guard arrays |
| WN-06 | Course config lookup accepts inherited property names | Require own course key |
| WN-07 | Missing lesson or practice selection can crash scope navigation on startsWith | Guard selected identity type |
| WN-08 | Unknown lesson ID can change workspace context before failing lookup | Validate current catalog membership first |
| WN-09 | Unsupported lesson filter can enter active course state | Restrict allowed filter choices |
| WN-10 | Missing sidebar/content breaks navigation enhancement | Guard optional host elements |
| WN-11 | Other route replaces history even when underlying navigation did not switch view | Confirm destination before persisting route |
| WN-12 | Existing Other tabs retain stale selected or archive availability state | Reconcile entries and selected state |
| WN-13 | Browser Other route restore bypasses weakness filter semantics and leaves preference stale | Restore matching filters and selected preference |

Six regression tests. No curriculum or production modifications.
