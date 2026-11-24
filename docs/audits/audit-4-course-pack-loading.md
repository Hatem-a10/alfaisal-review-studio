# Audit 4 — course pack loading

| ID | Evidence | Remedy |
|---|---|---|
| CP-01 | Stalled script loading leaves a permanent pending promise and loading screen | Add deadline and require safe reload after ambiguous execution |
| CP-02 | Synchronous script insertion failure leaves a rejected cached promise and prevents retry | Settle and clear the pending request on insertion failure |
| CP-03 | Inherited object keys can be treated as manifest entries or pending requests | Require own manifest keys and use prototype-free state maps |
| CP-04 | Late, duplicate or unsolicited readiness notifications can mark an unavailable course loaded | Accept readiness only for an active, nonfailed request and emit it once |

Four behavioral regression tests; shared loader only, no academic content or production changes.
