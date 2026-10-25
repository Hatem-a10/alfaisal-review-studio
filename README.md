# Review Studio

For Alfaisal M1-A Group 1.6 · CVP 112 and MOL 114 · Fall 2026

## Use
Open the published website in a regular browser. Set the planning day at the top. The overview prioritizes the MOL midterm on Thursday October 29, 2026 (50 MCQs, MOL 1–13). Daily schedule combines review due dates with separately labeled course events. All lectures provides course, status and due-date filters plus search.

Each lecture has independent first, second and third review checkboxes. Check a box after completing the pass; the app records the current completion timestamp in Riyadh time. Uncheck to clear that completion. Planned dates do not complete tasks. Nothing starts completed.

Use Edit to change the title, due dates, confidence or notes. Original preset dates are shown in the dialog and can be restored. Weak areas includes notes and confidence ratings 1–2. Course progress bars count completed review passes.

Progress is stored in local storage for this browser and website address. Use Export backup regularly. Import replaces progress after validation and confirmation. Data does not automatically move between devices, browser profiles, local files and the hosted website. Some embedded previews may not retain browser storage across reloads; use a regular browser and keep backups.

## Run locally
No installation or build step is required. Open dist/index.html in a browser, keeping the other dist files beside it. Alternatively, run the following from this folder, then open http://localhost:8080:

    python3 -m http.server 8080 --directory dist

The separate review-studio.html deliverable is a self-contained alternative. Its fonts use Google Fonts when available and fall back to system fonts offline. Browser storage behavior for local file URLs varies; a local server or hosted website is preferable.

## Source handling
All five supplied documents were extracted. CVP: 51 items (28 physiology and 23 anatomy/histology/embryology), with 153 exact planned review dates. Review passes run Oct 25–Nov 14; the PDF's mixed-MCQ/brief-recall schedule is retained through Nov 18. CVP syllabus objectives and assessment weights are available under Sources & coverage.

MOL: all 28 numbered guide entries, including two review sessions, with documented lecture dates and TBL grouping. MOL 1–13 are tagged as midterm coverage. Every MOL review due date is explicitly a suggested editable plan. Final and TBL coverage comes from the guide. Lab objectives and final lab coverage are documented; no unprovided lab review dates are invented.

Timetable: Sheet1 Male-I lecture columns and M1-A labs, including explicitly assigned groups 1.4–1.6. Shared horizontal merged cells are resolved. Printed slot labels and source cell addresses are shown; merged event durations are not inferred. Group-specific lab entries not matching 1.6 are excluded. Confirm timetable changes on Moodle.

## Files
- dist/index.html: page structure
- dist/style.css: responsive visual design
- dist/app.js: application and local storage, backup validation
- dist/data.js: extracted source data and immutable preset dates

## Verification
JavaScript syntax and application checks pass: item/pass counts, zero initial completions, independent checkboxes, completion timestamps, persistence with a storage adapter across application reload, edits preserving presets, filters, six views, valid backup round trip and rejection of malformed backups. Mobile-width browser preview confirmed the layout and checkbox/editor behavior. The embedded preview did not retain its saved checkbox across a reload; regular-browser local storage is recommended.
