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

## CVP Week 1 additions (26 October 2026)

All ten supplied decks/PDFs are indexed: 328 slides/pages across P1–P4 and A1–A5. Both arrhythmia decks support P4; P5 and all original course-plan dates remain unchanged. There are 64 expanded topic sections with inline practice, 140 added application MCQs (12 using focused source figures), 66 focused diagrams, 18 fill-in prompts and nine matching activities. All prior 1,208 bank questions and 43 supplementary checks remain intact.

Choose CVP 112 in Learn & master, then choose the lecture/topic. Material library includes source coverage and presentation downloads.48 embedded narration clips are playable on their source slides, and relevant referenced clips appear in lessons. Narration has not been transcribed. Image-only pericardium text was OCRed; label order may differ from the original image.

Some embedded EMF vector diagrams are omitted by PDF conversion. Presentation downloads preserve those original diagrams. The Normal ECG and Arrhythmia II decks separate audio into slide-linked playable files to fit hosting file limits; their visual presentations retain original slides and diagrams. The histology download uses smaller raster images while preserving embedded vector diagrams; full-resolution extracted lesson figures remain available. Source errors are labeled beside relevant content: right sinus-horn fate, usual PAC pause, AV-block classification and flutter ratios. New MCQs are authored study applications, never labeled as verbatim previous-exam items.

Validation checks all64topics rendering, retained question objects/IDs, question grouping/answer keys/reasons, source-page references, local assets/audio, quiz grading/reload persistence, no seeded review completion, exact85% rules, original exams, elimination/undo/timer controls, and schedule personalization.

## Transcript priorities and exact daily tasks (version17)

Ten individual CVP transcripts (351pages) are indexed with their original page numbers. Eight match the combined CVP transcript page-for-page and use verified offsets; P4/P5 PDFs are in public/study_material. All ten original uploads are stored in the workspace study_material/cvp-week1-transcripts folder. New material adds11topics and21explained application questions; prior question content/IDs and progress remain intact. P5 learning follows the supplied ECGIII/PartII transcription without renaming its preset schedule entry.

Stars distinguish explicit lecturer exam statements from lecturer learning priorities. Evidence excerpts and source links accompany each star. Added high-yield teaching has a separate label; exclusions such as developmental-gene memorization and the ablation aside are retained as scope notes. Source errors are clarified rather than silently treated as correct.

Overview, Daily tasks and Daily schedule show only unfinished passes due on the selected date, followed directly by a separate overdue section retaining original dates. MOL/CVP dividers and a collapsed completed section keep the list readable. These lists do not use a budget to hide or defer work; no catch-up redistribution runs from the daily interface. Manual date editing and independent completion/undo remain available. Sidebar navigation uses a consistent stroke SVG icon family.

## Study workflow and Anki upgrades

- **Focus & repair:** open a weak topic from saved wrong answers or lesson performance. Read the teaching and take its short retest on the same lesson page. Retests do not unset earned Learn completion. A successful retest removes that topic from the repair queue until newer mistakes are recorded.
- **Exam review:** filter mock results by wrong, unanswered or flagged questions; jump into the relevant teaching, inspect source links, and note why an answer was missed. Original papers have equivalent filters labeled against their printed keys.
- **Progress:** private cloud sync and the main JSON backup now include the wrong-answer bank, mock history and active mock, original-set runs, lesson drafts, study position, reviewed upload questions, visual exercises and Anki card ratings. Conflict resolution offers a merge; restore/merge creates a device recovery copy. Older open tabs preserve the newer companion data. Large snapshots use private R2 objects with revision pointers in D1.
- **Upload review:** Material library → Review inbox. PDF/TXT/Markdown/question JSON plus PPTX/DOCX text are supported. PowerPoint/Word embedded figures can be attached; PDF figures can be cropped to the relevant area. Repair and verify detected questions, their options, keys, explanations and topic mapping before approval. Scanned pages and uncertain keys remain explicitly flagged. There is no unattended AI generation or inferred official answer key.
- **Visual recall:** open a lesson’s “Practice this topic’s figures,” draw a mask over a label in a cropped source diagram and enter its verified label (slash-separated alternatives are accepted). Saved exercises and results sync; they remain separate from the 85% MCQ rule.
- **Mastery:** Focus & repair → Mastery settings optionally raises the minimum attempted core questions. Default 1 retains the existing 85% rule. No setting or reading action manufactures completed MCQ answers.
- **Anki:** import .apkg/.colpkg packages up to 50 MB. Legacy SQLite and modern Zstandard packages, basic/reverse/cloze/typed-answer templates, nested cloze, bundled images/audio/fonts, MathJax notation and native image masks are handled. Decks are kept in IndexedDB and uploaded privately when cloud saving succeeds. A second device can download the same package; card ratings sync through the study account. Original package exports remain unchanged; site ratings have a separate JSON export/import and are included in the main progress backup.

Anki compatibility is intentionally explicit: imported intervals initialize this site’s schedule; Again/Hard/Good/Easy use the site scheduler, not Anki FSRS or AnkiWeb synchronization. Deck JavaScript, desktop add-on APIs and TTS are not executed. Script-dependent decks display a compatibility notice. Large collections should be exported as smaller subdecks. Imported suspended cards remain outside the review queue.

File readers are vendored with their licenses in `public/vendor/`: JSZip 3.10.1, sql.js 1.13.0, fzstd 0.1.1 and MathJax 3.2.2. Format references: [Anki package metadata](https://github.com/ankitects/anki/blob/main/proto/anki/import_export.proto), [notetype formats](https://github.com/ankitects/anki/blob/main/proto/anki/notetypes.proto), [SQLite schema](https://github.com/ankitects/anki/blob/main/rslib/src/storage/schema11.sql).

Validation: `node tests/study-upgrades.test.mjs` exercises old/new packages, media, nested cloze, companion-store backups and merges, revision conflicts, authenticated deck isolation, large snapshots, older-client compatibility, the 15% cutoff and lesson mastery independence. `npx tsc --noEmit` checks server code; `npm run build` builds the deployment. Browser checks cover package import/audio/cloze, in-place retests, quiz resume, backup merge, diagram-mask editing and the review inbox.
