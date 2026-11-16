# v1.64 — Booklet modes and mobile layout

Added Random order, Include SAQs and Include OSPE checkboxes to the standalone Booklet page. Random order saves a Fisher–Yates permutation of question IDs in the existing per-student options; rendering/reloading never reshuffles it. Disabling random order restores source order. Existing accounts include both written types by default. Type filters apply to every completion filter and pinned questions. Changing mode resets only navigation, never answers/progress. Cloud reconciliation selects the newest navigation preferences with their permutation.

Fixed Back → Next following an outdated cursor rather than the viewed question. Booklet options/control groups wrap on phones with touch-sized labels, non-zooming input fonts, natural page scrolling, and no height-limited nested panel. Source figure geometry is retained where available.

Checks: four focused logic tests; four isolated 390px mobile browser checks (controls, type/random persistence, layout/scroll bounds, refresh); production build. No broad suite or subagents; physical Safari not tested. Existing question data, attempts, D1/R2 and permissions unchanged.
