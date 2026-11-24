# Audit 4 — mixed practice scope

The findings concern the shared selector and practice actions, not archived CVP lecture content.

| ID | Evidence before fix | Remedy |
|---|---|---|
| MX-01 | The sets selector hardcodes MOL and CVP; REN mapped lessons cannot be selected | Use the currently selected course and registered label |
| MX-02 | Mixed-set candidate construction bypasses the archived-item visibility check for supplemental questions | Enforce the shared visibility predicate on every candidate |
| MX-03 | Deduplicating mixed-bank rows before checking usable question structure allows an invalid duplicate to replace usable evidence | Reject unusable rows before deduplication |
| MX-04 | Mock lesson counts derive from a different pool than the verified-source generator, omitting original-only candidates | Use unselected verified mock candidates for the selector |
| MX-05 | Bulk selection uses a different bank from the displayed lesson rows, including lessons not displayed or omitting supplemental-only lessons | Drive the bulk action from the displayed eligible rows |
| MX-06 | Selection count includes stale and duplicate lesson IDs across course switches | Count only unique currently eligible IDs |
| MX-07 | Mixed-set candidate filtering does not require all mapped lectures to belong to the current course | Restrict all mapped IDs to the selected course |
| MX-08 | A stale lesson control can insert an unavailable or out-of-scope ID | Validate the selected ID against the eligible rows |
| MX-09 | Toggling mock mix mode clears an unrelated in-progress concept set | Clear the concept set only when its own selection changes |
| MX-10 | Unrecognized mix mode event data can dereference an undefined selection | Guard event modes |

Tests: tests/cloudflare-staging-audit4-mixed-practice-scope.test.mjs. Candidate and authenticated hosted verification required.
