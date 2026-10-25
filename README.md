# Hatem Alabrach · Study Command Center

Alfaisal M 1-A Group 1.6 · CVP 112 and MOL 114 · Fall 2026

## Start studying

Open Learn & master and choose your lecture. The familiar lesson catalog, topic selector, progress tools and complete question bank are retained. Each teaching topic is displayed separately, with its relevant questions directly underneath it on the same page. There is no automatic advancement or required switch to a separate quiz tab.

The complete original 1,156-question bank is retained. Existing reviewed and authored questions are distributed across the corresponding lesson topics, with 43 additional formative checks retained where they fill a teaching gap. There is no two-question cap. Every original question remains available; some relevant questions appear under more than one closely related topic. Lecture and topic counts show what is available.

Answer any number of questions and press Check my answers. Only newly answered questions are checked; unanswered questions remain open. Each checked item shows its explanation and reasons for every choice. Retry topic questions clears missed answers first, while previous performance evidence remains saved. The first distinct attempt per question per day controls MCQ evidence, so repeated revealed answers do not inflate results. Independent review checkboxes are never completed by a quiz.

Use the topic selector or Previous/Next to move when you are ready. Full concept practice, detailed progress, 65 fill-in-the-blank exercises, 13 matching sets, source material, timed mocks, notes and confidence tools remain available. The Undo and AMOLED timer-contrast fixes are preserved.

## Question bank and repairs

The bank contains 1156 explained quiz items: 424 reviewed/adapted past-paper questions, 136 lecture application questions, and 596 concept-check variants. These counts do not represent independently reviewed official exam questions. Repeated source stems can share a canonical practice version. Original source text, PDFs and the source-question index remain available. Adapted questions retain original wording and a repair note explaining missing choices, clarified stems, reconstructed figure information or corrected keys. Repair details are shown after submission so they do not reveal answers early.

All supplied MOL midterm presentations are represented, including the shared 28-slide MOL 10–11 deck, MOL 12 and MOL 13. There are 346 visual slides across the presentations. The original 359-page transcript compilation and the separate 37-page MOL 4 transcription are linked to the corresponding lessons. The new three exam PDFs are included. The supplied dist/client/materials/mol-midterm.pdf is identical to the already included 57-page midterm booklet, so it was not duplicated. Original PPTX files remain untouched in Downloads; the site serves full visual previews and slide PDFs rather than the large original PPTX binaries. Search includes slide text, speaker notes, transcription text and exam pages. OCR-derived text is marked.

Some supplied source statements and printed keys are scientifically inconsistent. Source notes flag them, including HFE/beta-2 microglobulin, cytosolic versus secretory targeting, malformed glucose units/HbA1c targets, the insulin-solubility wording, and several recalled exam keys. The teaching material uses the corrected mechanism and does not prescribe clinical targets from those slides. Questions from older papers that belong to later MOL lectures remain outside the MOL 1–13 mock-exam scope.

## Practice sets and timed mocks

Practice & MCQs offers a course/lecture/concept selector and complete concept sets. Timed mock exam generates 1–200 distinct questions within the selected scope. Default scope is MOL 1–13, with 50 questions and an editable practice timer. Neither the timer setting nor the random question mix claims to be an official exam duration or blueprint. The official midterm is Thursday October 29,2026:50 MCQs on MOL 1–13.

A mock shuffles questions and options, displays all questions together, offers flags and a navigator, saves answers on this device, and uses an absolute deadline. Leaving/reloading does not pause the timer. Expiry automatically submits saved answers. Unanswered questions count as incorrect. Results include per-lecture accuracy and explanations for every choice. Export results for a separate copy. Active mocks and mock history stay on the device. A discarded unfinished mock does not record scores.

Only the first attempt on each distinct past-paper/application/uploaded question per Riyadh day contributes new MCQ evidence. Repeating a revealed answer does not inflate the tracker. A mock still reports its complete grade even when some questions were already seen; it separately reports newly logged evidence. Full submitted sets are grouped when calculating the last five practice sessions per lecture. Low performance feeds weak topics and earlier spacing suggestions. Importing an explained JSON question set also practices the whole set together.

## Your profile and saving

Change photo beside your name accepts browser-readable images and creates a small raster thumbnail. The profile photo syncs with settings and is included in export/import backups. Remove photo restores initials. AMOLED mode and accent colors remain configurable.

Review checkboxes are independent and save individual completion timestamps. An 8-second Undo button appears in the completion toast. It restores only that pass and retains later notes or other completed passes. No review, confidence rating or test result is pre-completed.

Sign in using the same ChatGPT account on each device for private per-user progress sync. The website's existing audience is preserved. Look for Cloud saved before switching devices. Offline changes stay on the device. Conflicting device copies require an explicit choice before overwriting. Export a JSON backup for an additional copy; version 1 and version 2 progress remain supported. Uploaded personal materials use per-user D1 metadata and R2 storage. Static course sources are part of the published website.

## Reviews and the daily plan

CVP preserves 51 scheduled items and 153 exact preset review dates, with its closing plan through November 18. There are 237 independent review passes across all 79 numbered course items. MOL review dates remain suggested and editable. Official events/attendance times are not invented.

Set the planning day, daily budget and study window. The planner uses documented Group 1.6 slots, estimates 35/25/15 minutes for passes 1/2/3, includes five-minute breaks and prioritizes weak performance, difficulty, confidence, overdue reviews and exam dates. MOL 1–13 takes priority through October 29 while retaining CVP when both fit. It plans one pass per lecture per day. Logged study time or completed-review estimates, whichever is larger, consume the budget. Capacity warnings identify work that will not fit. Catch-up mode projects a seven-day redistribution and applies only personal dates.

After Review 1, ordinary spacing suggestions are+2/+6 days; difficult topics use+1/+3. After Review 2, the third pass is suggested at+4 days, or+2 when difficult. Difficulty includes a user flag, confidence 1–2, recent MCQ accuracy below 60% or weak learning evidence. Suggestions are capped before the upcoming exam when possible. They do not silently overwrite dates. Apply them explicitly or edit dates, and restore original presets any time.

Readiness is a study heuristic:40% completed reviews,20% confidence and 40% recent MCQ accuracy, weighted equally per lecture. Missing evidence contributes zero. MOL uses midterm scope through October 29 and the full course afterward. Confidence, notes, lecture links, study timers, statistics and the weekly activity heatmap remain available.

## Local development

Source assets live in public/, not generated dist/.

    npm ci
    npm run build

For a fresh local database, apply both checked-in migrations using the supplied Sites environment:

    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d 1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_huge_gladiator.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d 1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_purple_norman_osborn.sql
    npm run dev -- --host 127.0.0.1

Open the printed local URL and /signin-with-chatgpt?return_to=/index.html for the preview identity. Local and production databases are separate. Hosted publication uses the Sites build/source/deployment workflow and existing D1/R2 bindings. The separate review-studio.html is a device-local standalone copy; synchronization/uploads and protected source URLs require the published site.

## Architecture and validation

- data.js retains original course items, events, source objectives and immutable review presets.
- engine.js contains pure spacing, readiness, session aggregation and planner rules.
- learning-data.js contains source text, references, stable concepts and explained question bank.
- teaching-data.js contains complete teaching guides and retrieval exercises.
- learn-engine.js provides transparent core-concept checkpoints.
- learning-ui.js provides full guides, figures, recall activities and adaptive concept sets.
- exam-engine.js/exam-tools.js provide selection, shuffled keys, saved absolute deadlines, grading, first-attempt evidence and profile tools.
- app.js maintains migration-compatible storage, reviews, undo, timers, notes and cloud conflicts.
- app/api/progress and app/api/materials enforce authenticated user isolation and same-origin/revision checks.

Checks cover all guides and source references, source images/pages, stable prior IDs, valid answer keys and reasons, repaired-source labels, no seeded completion, immutable 237-pass plan, all-question practice, distinct-topic spacing, first-attempt idempotency, full-set MCQ aggregation, timer expiry/reload/unanswered grading, safe discard, independent undo, thumbnail validation/backup, per-user API isolation and cloud conflict handling. Browser checks use a separate local preview account and do not seed production progress.
