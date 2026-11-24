# Audit 4 — visible-question pacing and debrief

| ID | Evidence | Remedy |
|---|---|---|
| DP-01 | Picker or element IDs coerce invalid values and accept indices beyond the active run | Validate canonical indices against run length |
| DP-02 | Malformed pacing containers throw during periodic sample | Repair container shape before recording new time |
| DP-03 | Existing infinite or string seconds contaminate new measurements and display | Require finite positive numeric durations |
| DP-04 | Sampling anchor moves backward to paused/deadline time; extending a deadline can re-count an elapsed interval | Advance anchor to sample time after clipping measured interval |
| DP-05 | Classic mock debrief treats any integer choice as answered, even outside option range | Validate canonical choice range |
| DP-06 | Debrief grouping repeatedly scans missed-index arrays | Index missed/unanswered membership |
| DP-07 | Original debrief filters removed question metadata before indexing timing rows | Keep original run IDs and their positional timing |
| DP-08 | Debrief retry can include inaccessible course questions | Recheck visibility on retry |
| DP-09 | New missed-question set is not persisted until a later answer change | Save the created practice draft |

Five behavioral/guard tests. Shared runtime only; no archived academic content or production changes.
