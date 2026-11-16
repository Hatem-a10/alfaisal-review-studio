# v1.62 — Booklet review explanations

Imported supplied cvp19-booklet-explanations.json by exact question ID: 1,214 unique matches (834 MCQ, 188 SAQ, 192 OSPE). Only MCQ explanation and written sourceExplanation fields changed in the canonical booklet. Question text, choices, printed answers, accepted keys, figures, other metadata, and booklet revision remain unchanged. No progress migration, user-data writes, storage-binding changes, or answer corrections.

Review renderers overlay the new notes on saved question snapshots without changing snapshot scoring/content. Shuffled MCQ review labels option references as booklet order. Written/OSPE notes appear only with reveal/results; disputed keys and figure uncertainty remain review notes. Dedicated OSPE rubric uses the same sourceExplanation keyed by station ID.

Previous Exams & TBLs now hides all corrected-booklet collections and separates CVP/MOL with a course selector (CVP default). Canonical collections and attempts are retained for Booklet/other existing consumers.

Verification: exact-ID import and field-only comparison for all 1,214 entries; 3 focused automated checks; 6 isolated local-browser smoke checks including MCQ, SAQ, OSPE review, shuffled submission, saved snapshot review, and catalog separation; build passed. No broad suite or subagents. Chromium/Brave emulation only, not physical Safari.

The revised booklet JSON is deferred and temporarily served from the build instead of the older immutable R2 copy. Existing R2 object/proof retained; no unverified object is pruned.
