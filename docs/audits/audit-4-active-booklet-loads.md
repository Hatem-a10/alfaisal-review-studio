# Audit 4 — active booklet loading

| ID | Evidence | Remedy |
|---|---|---|
| AB-01 | Both loaders accept any truthy questions.length, even non-array payloads | Validate actual arrays before publishing |
| AB-02 | Repeated question IDs can share one progress key | Reject duplicate IDs |
| AB-03 | Invalid question type or missing prompt enters the viewer | Validate required question fields |
| AB-04 | Invalid physical source page creates a misleading source link | Bound source page by documented PDF length |
| AB-05 | Unchecked options or answer keys can enter grading | Require valid options and printed keys |
| AB-06 | Malformed figure or context collections can crash rendering | Validate nested collections before installation |
| AB-07 | Stalled private pack requests have no deadline | Apply abort deadline and keep retryable loader |
| AB-08 | REN mock bank failure lacks a retry control and can leave empty practice permanently | Expose loading/error state and retry action |
| AB-09 | REN loader installs pack before building the mock bank | Construct bank before publishing pack |
| AB-10 | REN load completion redraws another course's booklet or practice | Check the active course before redraw |
| AB-11 | MOL chapter metadata can generate invalid source links or crash the chapter list | Validate chapter collection and locators |

Synthetic regression tests exercise the validation and retry behavior. Private production packs are not in the repository; authenticated compatibility verification remains required. No source answers, documents, or saved data were changed.
