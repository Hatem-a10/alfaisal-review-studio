# v1.59

Booklet history supports back/forward after skips without changing answers. Up/Down selects choices and prevents page scrolling; Right checks a selected answer before continuing. Shortcut spacing is isolated from feedback boxes. Navigation history stays in the existing timestamped per-student sync state.

Study Activity adds questions answered (unique recorded identities per day), completed reviews and recorded minutes. The default period includes all available historical dates; Last 12 weeks remains available. Existing completion baselines and unknown historical completion remain unchanged. Stored question events, booklet results and finished mock snapshots supply historical evidence; unavailable old attempts are not invented.

Validation: focused skip/back/forward and historical-question/date-range assertions passed; syntax checks and standard build passed. No broad suite or subagents. Existing account progress, infrastructure and access preserved.
