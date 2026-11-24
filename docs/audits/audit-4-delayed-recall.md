# Audit 4 — delayed recall integrity

Scope: shared delayed-recall runtime, no lecture or answer-key changes. IDs are batch-local until the consolidated register is updated. All changes require CI and hosted verification.

| ID | Source evidence before fix | Remedy |
|---|---|---|
| DR-01 | retentionPanel and submit call .filter on retentionAttempts without verifying an array | Guard shape and preserve unreadable stored data |
| DR-02 | Invalid timestamp on a correct retest can reach localDate/formatting | Exclude invalid chronology from recall evidence |
| DR-03 | Truthy non-boolean correct flags report successful retest | Require explicit boolean flags |
| DR-04 | retentionState assumes the last array item is the latest | Sort validated records without mutating the input |
| DR-05 | Invalid practice timestamps fall back to epoch, unlocking recall prematurely | Require timestamped practice |
| DR-06 | Truthy non-boolean practice flags unlock recall | Require explicit true |
| DR-07 | History and stale forms are scoped only to topic ID, not lesson; a stale lesson/topic can also be dereferenced | Include lesson ID in new records and forms, guard missing lesson/topic, keep legacy records matching a question in that topic |
| DR-08 | Numeric coercion of blank, hexadecimal or decimal choice strings admits invalid submissions | Require canonical nonnegative safe integer choice within options |

Behavioral regression cases: tests/cloudflare-staging-audit4-retention-integrity.test.mjs. Existing 600-attempt retention policy unchanged. No production release or live data changes.
