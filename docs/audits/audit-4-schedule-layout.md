# Audit 4 — schedule layout

| ID | Evidence | Remedy |
|---|---|---|
| SL-01 | Independent pairwise overlap widths collide in chained intersections | Allocate consistent lanes per connected overlap cluster |
| SL-02 | Fixed timetable bounds clip valid classes outside default hours | Expand time axis to include selected sessions |
| SL-03 | Thirty-pixel minimum event height overlaps adjacent short sessions | Respect actual event duration |
| SL-04 | Malformed timetable envelope is published before validation | Validate events and weeks before assignment |
| SL-05 | Missing assessment references or invalid group metadata can abort valid assessment updates | Skip malformed assessment metadata |
| SL-06 | Untimed entries with missing source crash agenda rendering | Normalize optional source before filtering |
| SL-07 | Missing event dialog body or repeat modal open can break event inspection | Guard dialog body and already-open state |

Synthetic tests only. No schedule source or student data changed.
