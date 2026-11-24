# OSPE circuit and draft integrity

| ID | Source evidence | Resolution |
|---|---|---|
| OS-01 | `OspeCore.select` assumes valid array and non-null station objects. | Reject malformed collections and entries. |
| OS-02 | Circuit accepts repeated station ID under different concepts. | Track both ID and concept. |
| OS-03 | Shuffle callback at 1 or nonfinite values indexes outside the pool. | Bound random index. |
| OS-04 | Fractional and infinite station duration produces invalid countdowns. | Use bounded finite integral duration. |
| OS-05 | Invalid timestamp or seconds in timer position emits NaN and never finishes. | Return terminal position for invalid state. |
| OS-06 | Explicitly finished run can still appear active in position calculation. | Honor finish flag. |
| OS-07 | Restored drafts accept rest-only, duplicate, malformed or oversized slots. | Validate assessed station identity and slot structure. |
| OS-08 | Draft restoration blindly accepts answer and mark fields. | Restore only valid station-part strings and bounded marks. |
| OS-09 | Score repeats duplicate station slots in denominator. | Mark duplicates incomplete and count once. |
| OS-10 | Malformed station marks can contaminate score with NaN. | Reject invalid scoring parts. |
| OS-11 | Practice-only filter can launch empty assessed circuit, then crash on review. | Refuse empty assessed circuits. |
| OS-12 | Stale input event can change finished or unrelated drill answers. | Guard finished state, station and part. |
| OS-13 | Stale drill-open or reveal/reset controls can mutate unrelated state during circuit. | Require active drill and valid station. |
| OS-14 | Stale zoom can display unrelated station during circuit. | Restrict zoom to permitted station. |
| OS-15 | Review index persists between circuits and accepts invalid review controls. | Reset and validate index. |
| OS-16 | Mark handler accepts arbitrary station, part and score including before drill reveal. | Validate context and mark bounds. |
| OS-17 | Save handler lacks finished-state guard. | Require completed circuit before saving. |
| OS-18 | Escape-close of image dialog leaves stale DOM dialog. | Remove on close event. |
| OS-19 | Missing source metadata throws on source title dereference. | Render unavailable source safely. |

Six regression tests. Shared OSPE runtime only; no CVP academic content, no production deployment or student data mutation.
