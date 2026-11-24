# Audit 4 — active daily queue

| ID | Evidence | Remedy |
|---|---|---|
| DQ-01 | Daily course groups are hardcoded to MOL/CVP so scheduled REN reviews count in the header but never render | Include REN and other actual course groups |
| DQ-02 | Dashboard excludes any course with unscheduled configuration even after review dates or completions exist | Include active courses with actual dated or completed review evidence |
| DQ-03 | Blank or impossible dates can be treated as overdue by lexical comparison | Require a real calendar day |
| DQ-04 | Unscheduled overflow sorting dereferences missing dates | Use consistent defensive date ordering |
| DQ-05 | Calendar agenda enhancement slices from -1 when the markup anchor is missing | Preserve original markup if the anchor is absent |
| DQ-06 | Dashboard labels completion of tasks scheduled for the selected day as done today | Label the actual scheduled-task metric |

Five behavioral/guard tests. No CVP lecture-content changes or production deployment.
