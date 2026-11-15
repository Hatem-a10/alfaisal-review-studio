# Group timetable integration — v1.51

Parsed all three supplied MOL DOCX tables and all cells/merged ranges on the Renal workbook's sole sheet. Exact source SHA-256 values and cell/table locations are retained in public/group-timetables.json. No original documents or personal group-roster files were added to the publisher package.

Imported 268 canonical sessions (29 MOL lab entries and 239 Renal timetable entries), eight verified class/section lab lists, and five Renal weeks November22–December24. GRC placeholder bands are advisory rather than actual English sessions and are omitted.

Precedence authorized by the user: Renal/weeks10–16, then CVP, then FND. Overlapping MOL assignments for the exact date/class/section/lab are resolved with the latest document first, retaining original references. Separate historical sessions remain. The Nov4 F2-A labs2.3/2.4 use SG81 from the newer file, instead of duplicating the older unlocated listing. No unsupported CVP room was invented. Renal merged durations run to the last printed interval end (for example8:00–9:50), not an assumed next-hour end.

Existing CVP M1-A class sessions remain available to that section; the original lab-filtered timetable remains specific to1.6. Other subgroups do not inherit undocumented owner-only labs. Other classes receive only the sessions actually documented for them. These attachments do not provide full historical FND/CVP class timetables for all groups.

A genuine overlap remains December1 for M1-A labs1.5/1.6: the newer MOL document says15:00–17:00 and the Renal workbook also lists Anatomy lab M1-A15:00–17:00. Both are preserved, shown side by side, with an overlap notice. No date/time was guessed to resolve it.

English preferences use Mon/Wed or Sun/Tue/Thu and17:00 or17:30, with exactly60 minutes duration. Preferences persist in the existing per-account snapshot; no records/review dates/earned results are edited. Explicitly clearing a lab group does not fall back to the owner's lab. Existing owner preferences and profile remain intact.

Settings expose class, section, filtered lab list, English days and start time. Save updates the Schedule immediately, without replanning study progress. The local/offline timetable uses a release-specific cache; the imported JSON is in the offline core manifest. Reproducible importer: scripts/import-group-timetables.py (REVIEW_SCHEDULE_SOURCE_DIR optionally selects source folder).

GitHub is excluded at the user's request. Publication uses the existing native Sites project and bindings.

Validation: 30 targeted automated tests and12 isolated browser checks pass, with0 browser exceptions. Settings changes preserve the actual study record state byte-for-byte in the browser test and survive refresh. Tested390/820/1440px schedule views. TypeScript/build pass; changed-file lint has0 errors (two classic global-function warnings). Startup remains within the unchanged budget and one bundled classic request. Displayv1.51/nativeversion152. No GitHub configuration or push was performed.
