# Study Command Center

Alfaisal M1-A Group 1.6 · CVP 112 and MOL 114 · Fall 2026

## Use the website
Sign in to the published site with the same ChatGPT account on each device. Existing review progress uses the same browser storage key and is retained. Look for “Cloud saved” before switching devices. While offline, changes stay on the device and sync when the connection returns. If two devices changed the same cloud version, saving pauses and asks which copy to keep; export a backup before choosing if you need both copies.

On Overview, set the planning day, available study minutes and your personal study window. The daily plan avoids the documented timetable slots, includes five-minute breaks and prioritizes weak MCQ results, difficulty, confidence, overdue reviews and exams. MOL 1–13 gets priority through the October 29 midterm, with CVP time reserved when both fit. The planner schedules one review pass per lecture per day. Completed-review time estimates or logged timer minutes, whichever is greater, consume the daily budget. Estimates are 35/25/15 minutes for passes 1/2/3. These are adjustable personal planning assumptions, not official teaching durations. The selected study window defaults to 17:00–23:00 and can be changed.

Class times are reserved using the exact printed slots only. Merged lecture/lab/exam durations are not inferred; use Moodle to verify longer or changed sessions and adjust your study window. A capacity check highlights midterm passes that will not fit before the exam.

## Spaced repetition and MCQs
Check a review only when you finish. All passes are independent and save completion timestamps. After completing a first pass, normal suggestions are +2 and +6 days; difficult topics use +1 and +3. After a second pass, third-pass spacing is +4 days normally or +2 days for difficulty. Difficulty means your difficult flag, confidence 1–2, or recent MCQ accuracy below 60%. Dates are capped before the upcoming exam where a spaced sequence fits; impossible spacing is flagged for manual planning. Suggestions never silently overwrite dates. Click Apply suggestion or use Edit. Original CVP dates remain available and can be restored.

Log MCQ results from a lecture or Practice & MCQs. Enter attempted and correct counts and a practice date. The last five sets per lecture determine recent accuracy. Below 70% appears in weak topics; below 60% shortens spacing. MCQ entry never checks a review pass. You can remove mistaken results from practice history.

## Other tools
- Readiness estimates: equal weight per lecture, using 40% completed passes, 20% confidence and 40% recent MCQ accuracy. Missing inputs contribute no evidence. Scores show evidence coverage and are study heuristics, not predicted exam grades or an official blueprint. MOL uses midterm scope through October 29 and all numbered items afterward.
- Confidence: 1–2 struggling (red), 3 needs review (yellow), 4–5 mastered (green), unassessed gray.
- Catch-up: seven-day projection spreads unfinished passes within the budget and class slots. It assumes daily completion. Applying it changes personal dates only; it never completes checkboxes. Any reviews still beyond capacity remain visible.
- Timer: start per lecture, finish to save actual study time; completion is separate. Running timers stay on that device. Sessions over eight hours must be discarded.
- Materials: Edit accepts up to 30 http/https links for slides, recordings or question banks.
- Heatmap: last seven days of completed passes, MCQ sets and timed-study days, using Riyadh dates.
- Practice exam mode: import your own verified JSON question set, answer questions, then save results by lecture. The question bank stays on the device; recorded results sync. Template example text must be replaced before use.
- Export/import: backup format 2 includes all progress, MCQ results, saved sessions, links and planner settings. Old version 1 backups still import. Import validates before replacing progress and syncing it.

## Sources
All five original documents remain represented in public/data.js. CVP preserves all 51 scheduled items and 153 exact original review dates, plus the closing mixed-MCQ/recall plan through November 18. MOL retains the guide's 28 numbered entries, lecture date ranges, TBL groups, assessment coverage and syllabus objectives. Every MOL review due date is a suggested editable plan. No new official event, attendance time, completion history or MCQ result is seeded.

## Code and local development
This upgrade adds the supplied Sites Vinext framework for authenticated cloud progress. Source assets live in public/, not generated dist/.

    npm ci
    npm run db:generate   # only after schema changes
    npm run build

For a local database, apply the generated migration once:

    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_huge_gladiator.sql
    npm run dev -- --port 5173 --hostname 127.0.0.1

Open http://127.0.0.1:5173/signin-with-chatgpt?return_to=/index.html to use the supplied preview identity. Local and production databases are separate. Hosted migration and publication use the Sites workflow.

The separate review-studio.html download works without a server, using device storage and JSON backup transfer. Account synchronization requires the published site. Do not open the downloaded file expecting it to share the hosted site's browser storage.

## Architecture
- public/engine.js: pure spacing, readiness, prioritization, timetable-slot allocation and catch-up calculations.
- public/app.js: UI, migration-compatible local storage, MCQs, timer, question import and cloud conflict handling.
- public/data.js: original extracted course data and immutable preset dates.
- app/api/progress/route.ts: authenticated per-user snapshots with validation, same-origin checks, and optimistic revision checks.
- db/schema.ts and drizzle/: cloud database schema and migration.

## Validation
Application checks cover zero seeded completions; 237 independent passes; all eight views; legacy/new backups; reload; MCQ-driven ranking; deadline-aware spacing; immutable presets; budget/breaks; class-slot avoidance; one pass per lecture per day; time already studied; catch-up non-mutation and application; readiness; question import; cloud adoption and conflicting-device protection. API checks cover authentication, per-user isolation, same-origin enforcement, create/read/update, revision conflicts and malformed input. Framework build and TypeScript checks pass. Browser preview confirmed MCQ results affect priorities, completion generates spacing, and preview-account cloud saving survives reload. Preview test data is separate from production and is not seeded into the website.


## Teaching and learning upgrade

Open Learn & master for 79 guided core-topic lessons with 244 concept explanations. The 518 graded items comprise 488 authored concept-check variants plus 30 selected past-paper questions with reviewed explanations. These are not 518 independently reviewed past-paper questions. Every graded item explains the correct answer and each distractor. The complete four new PDFs remain available as original files, with 964 extracted pages and an index of 1,370 deduplicated source questions. Questions lacking reviewed explanations, complete options, reliable keys or necessary figures stay in the source-reading index rather than affecting checkpoint grades. Examples of detected source errors are labeled. Booklet anatomy numbers are matched by topic to the current syllabus, and source page links use physical PDF pages rather than the booklets’ inconsistent table-of-contents numbering.

The guided learning loop teaches a concept, asks for active recall, presents an answerable MCQ, explains all options, and revisits weak concepts after other questions. A checkpoint requires all lesson cards read, every core concept answered correctly twice with at least two intervening questions, and at least 80% accuracy over the recent two-times-concept-count attempts (minimum six). A wrong answer resets that concept’s streak. The learner may explicitly move on without passing; the checkpoint stays incomplete. Later recall is prompted on the next day. These are transparent practice criteria, not a claim of genuine comprehension or validated exam mastery. Two differently phrased concept-check variants test the same underlying concept and do not count as separate concepts.

Only first attempts on distinct reviewed past-paper or user-uploaded explained-pack questions per day add MCQ results. Repeating a revealed answer does not inflate that score. Core concept-check mistakes also influence planner difficulty. Reading and learning checkpoints never automatically tick the independent review checkboxes. Learning attempts, card-reading progress, theme, accent and recorded results are included in the existing version-2 backup and private progress synchronization.

Use the AMOLED button in the header for a true-black canvas. The color picker changes the accent. Preferences sync with the account. Colors for confidence and wrong/correct answers retain their semantic meaning.

## Adding more material

Material library → Add material accepts PDF, TXT, Markdown, or explained question-pack JSON (25 MB maximum). Assign a lecture. PDF text is extracted in the browser; the original and extracted text are stored privately with per-user D1 metadata and R2 objects. Other users cannot list or read them. Definitions in explicit term:definition form can become source-based study cards when at least three usable definitions exist. A fully explained question-pack can be practiced inside the tutor, using its supplied key and per-option reasons. Question-pack keys are user supplied, not independently reviewed. New documents become searchable and attach to the chosen lecture; they do not automatically rewrite the curated core guides. Scanned or figure-only pages are flagged and remain available in their original form; automatic OCR and a general conversational AI model are not included. Continued uploads in this chat can be reviewed into the permanent bank.

Question packs require a `questions` array; each record has lectureId, question, options, zero-based answer, explanation, and a reasons array matching the option count. Reading materials and imported text are treated as data, not operational instructions. Do not put API secrets or instructions into a question pack.

The document library has a second migration: drizzle/0001_purple_norman_osborn.sql. Apply it to local previews after the first migration. Hosted publication applies pending schema migrations. R2 binding is BUCKET; D1 remains DB. Existing progress data and the original migration are retained.

Checks additionally cover all lesson/question/reference counts, per-choice explanations, conservative checkpoint rules, immediate-retry exclusion, wrong-answer resets, later recall, no automatic review completion, appearance and learning persistence, backwards-compatible backups, source-definition extraction, remediation rendering, material-upload validation, authenticated ownership, cross-user read rejection, and private text retrieval. Mobile browser preview confirmed AMOLED appearance and per-choice feedback after an incorrect answer. No preview test data is seeded into the published website.
