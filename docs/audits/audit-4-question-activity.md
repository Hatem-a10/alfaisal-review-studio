# Audit 4 — question activity history

| ID | Evidence | Remedy |
|---|---|---|
| QA-01 | Malformed records, mock arrays, and question rows can crash questionHistory | Guard collections and record shapes |
| QA-02 | A legacy aggregate expands one synthetic ID per answer, potentially millions of entries; invalid totals also enter this loop | Aggregate bounded valid session totals without per-answer expansion, deduplicating the same session |
| QA-03 | Negative or out-of-range stored mock answers count as questions answered | Validate answer indices |
| QA-04 | One-hop alias lookup counts chained aliases separately | Resolve alias chains and cycles consistently |
| QA-05 | Invalid calendar dates and coercible timestamp types can create activity on incorrect days | Validate actual calendar dates and timestamp types |

Five regression tests; no modifications to student records, academic content or production.
