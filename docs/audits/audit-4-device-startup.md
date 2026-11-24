# Audit 4 — durable device startup and recovery

| ID | Evidence | Remedy |
|---|---|---|
| DS-01 | Online account verification can stall indefinitely before study startup | Apply a bounded abort deadline to the identity fetch |
| DS-02 | Account key regex coerces arrays or other non-string values into strings | Require a string with the exact account-key format |
| DS-03 | A blocked main device IndexedDB open has no rejection handler and late success can leave an unused connection | Report blocked startup and close late connections |
| DS-04 | The offline logout lock is removed before verified-account storage hydration completes | Retain or install the lock until successful hydration and account-key publication |
| DS-05 | Recovery-copy confirmation can remove a raw localStorage value different from the verified IndexedDB value, or associated with a changed account | Compare raw value, durable value, in-memory value and account marker before pruning |

The canonical and inline bootstraps remain identical. Five behavioral tests exercise actual startup with synthetic accounts, blocked open, late handle, malformed account, failed hydration, newer raw recovery copies and stalled verification. No changes to production or live student data.
