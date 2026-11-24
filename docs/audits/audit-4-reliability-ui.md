# Audit 4 — receipt archives and recovery UI

| ID | Evidence | Remedy |
|---|---|---|
| RU-01 | Optional receipt creation or storage exceptions can prevent primary mock submission or concept recording | Contain optional archive errors, preserve primary submission flow |
| RU-02 | Receipt byte-limit loop stops at a single oversized receipt and evicts previous valid history | Reject oversized new receipt before modifying archive |
| RU-03 | Frozen original grade and question display trust an unvalidated embedded receipt | Validate embedded receipt before overriding live result |
| RU-04 | Export button only searches optional archive, even when a valid current receipt exists | Resolve valid current and archived receipts; report missing export |
| RU-05 | Corrupt startup-metrics JSON or malformed sample values crash or distort Settings display | Safely read finite nonnegative samples without replacing corrupt raw data |
| RU-06 | Even-numbered startup samples use upper middle observation instead of median | Average both middle samples |

Four behavioral tests. No academic answer keys, production deployment, or student record migrations.
