# Audit 4 — onboarding planning integrity

| ID | Evidence | Remedy |
|---|---|---|
| OP-01 | Existing preserved unfinished dates are not included in the daily budget | Reserve those obligations before generating new dates |
| OP-02 | Coercing selected pass values accepts booleans, blanks and noncanonical keys | Accept only canonical pass indices |
| OP-03 | Repeated or invalid item IDs can allocate capacity more than once or target prototype keys | Validate and deduplicate IDs |
| OP-04 | Blank or null budget becomes zero and malformed constraints can throw | Validate constraint shapes and use explicit default |
| OP-05 | Tentative REN review dates consume capacity even when an incomplete plan is returned unscheduled | Release tentative allocations |
| OP-06 | The 366-day search restarts per pass, allowing later passes beyond the overall horizon | Apply a common planning horizon |
| OP-07 | Replanning verified bootstrap dates rewrites already completed review dates to today | Preserve the recorded dates and completion timestamps |
| OP-08 | Malformed completion timestamps can throw during prior-pass spacing | Validate completion dates without overwriting the stored evidence |

Seven behavioral tests. Retain existing records and warning/fallback behavior. No production deployment.
