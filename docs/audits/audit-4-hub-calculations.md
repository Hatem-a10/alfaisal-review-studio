# Audit 4 — classic dashboard calculations

Separate implementation paths from the newer grade-solver and assessment-planning modules. No official dates, academic content, or stored records changed.

| ID | Source evidence | Remedy |
|---|---|---|
| HC-01 | HubDomain.grades coerces blank, null and boolean marks or weights to numbers | Require finite numeric inputs |
| HC-02 | Classic grade engine permits repeated assessment IDs | Reject duplicates |
| HC-03 | Classic grade engine permits invalid target values | Validate 0–100 numeric target |
| HC-04 | Required raw marks divides by zero for an upcoming zero-weight assessment | Return not applicable |
| HC-05 | Equal-mark wrong-question allowance accepts fractional question counts | Require safe positive integers |
| HC-06 | Countdown only matches two-digit 24-hour start times with narrow delimiters | Support single-digit clocks, spaced ranges and explicit AM/PM |
| HC-07 | Invalid explicit clocks produce NaN countdown digits | Reject invalid clocks |
| HC-08 | Past same-day countdown sort uses remaining seconds, which are all zero | Sort using absolute start timestamp |
| HC-09 | Nonfinite or nonpositive session durations contaminate activity totals or active-day counts | Count finite positive durations only |
| HC-10 | Malformed activity records or history arrays can throw during the dashboard render | Guard containers and entries |
| HC-11 | Current-period highlight coerces missing interval bounds to numbers | Require finite bounds |
| HC-12 | Periodic dashboard paint rebuilds timetable and assessment catalog separately for every card | Build lookups once per tick |

Regression tests: tests/cloudflare-staging-audit4-hub-calculations.test.mjs. Full CI and hosted verification required.
