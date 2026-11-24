# Audit 4 — timetable selection

| ID | Evidence | Remedy |
|---|---|---|
| TS-01 | Legacy owner group defaults reappear after a user explicitly clears group selection | Honor configured group state |
| TS-02 | String-shaped group or lab membership is treated as a collection via includes | Require actual arrays and selected group |
| TS-03 | Invalid week start can throw during recurring English generation | Validate calendar dates |
| TS-04 | Malformed timed rows reach timetable selection and rendering | Require valid bounded time intervals |
| TS-05 | Duplicate event identity across legacy and official catalogs can display two rows | Prefer official row |
| TS-06 | Date-only assessment authority misses an explicit course when a generic title omits it | Use course fallback only for assessment rows; preserve explicit title course |
| TS-07 | Authority checks repeatedly scan all REN rows and derive identical assessment keys | Index valid intervals by date and assessment keys once |

Six behavioral tests. Existing official calendar and course content unchanged; no production release.
