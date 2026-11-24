# Audit 4 — original answer reconciliation

| ID | Evidence | Remedy |
|---|---|---|
| AR-01 | Missing or malformed startedAt can equate unrelated attempts | Require valid attempt timestamp |
| AR-02 | Malformed version values can produce NaN clocks and suppress an explicit answer change | Validate nonnegative safe integer clocks |
| AR-03 | A backward system clock can reduce the local answer version | Advance both local and remote versions monotonically |
| AR-04 | Reconciliation accepts malformed answer values and prototype keys | Filter unsupported answer containers, values and keys |
| AR-05 | Malformed saved exam JSON falls back to empty container before overwrite | Stop save and retain original data |
| AR-06 | A stale tab may submit a different finished copy over a frozen attempt | Preserve first submitted choices; allow idempotent receipt enrichment |
| AR-07 | Hydration comparison ignores set identity | Include set identity when determining restored attempt |
| AR-08 | Hydration can restore an older active attempt over newer remote attempt | Check remote attempt timestamp |
| AR-09 | Deferred hydration callback can save unrelated later selection | Bind callback to restored object |
| AR-10 | Explicit retry inherits previous attempt answer versions and receipt | Reset versions and receipt identity |
| AR-11 | Wrong-bank threshold is calculated before malformed options are excluded | Validate question shape before calculating eligibility |
| AR-12 | Wrong-bank adapter assumes string lecture identity | Validate lecture metadata before mapping |
| AR-13 | Invalid booklet page produces unusable provenance link | Use valid positive source page or fallback |

Twelve synthetic regression tests. No academic-source edits, live data changes or production deployment.
