# Audit 4 — managed resource browsing and sign-out

| ID | Evidence | Remedy |
|---|---|---|
| RD-01 | Failed Clerk sign-out leaves button disabled and rejection unhandled | Safe feedback and retry, retain offline lock |
| RD-02 | Repeated resource open events create multiple modal dialogs | Reuse and focus active dialog |
| RD-03 | Closing a resource dialog leaves fetch running and allows stale append | Abort on close and reject late results |
| RD-04 | First-page request error leaves Load more hidden with no retry | Show retry and retain offset |
| RD-05 | Malformed page can append partial rows before failure | Validate page and rows before append |
| RD-06 | Repeated resource IDs on shifted pages appear more than once | Deduplicate downloaded resource URLs |
| RD-07 | Empty page despite positive remaining total enables endless no-progress requests | Stop pagination and request refresh |
| RD-08 | Student resource query lacks a unique tie-breaker for equal titles | Add stable ID ordering |

Five behavioral tests, no live data changes or production deployment.
