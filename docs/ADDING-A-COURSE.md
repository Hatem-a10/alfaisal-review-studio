# Adding a course to Review Studio

A course is content and configuration inside the existing app. Register it in `public/course-registry.mjs` with its route slug, label, and stable lecture IDs. Existing study records depend on those IDs. Use the [lesson content standards](LESSON-CONTENT-STANDARDS.md) for source review and coverage.

| Content | Shared entry point |
| --- | --- |
| Lessons, objectives, and reviews | Learn & Master and its course selector |
| Official timetable and deadlines | Schedule and Countdowns, with verified group mappings |
| Practical exercises | Labs, with guided topics, checks, and lab progress |
| Image-based stations | OSPE, with recall, marking points, and a separate timed draft per course |
| Slides, handouts, and source files | Material Library |
| Booklet MCQs, SAQs, and OSPE | Booklet, with shared filters and navigation |
| Recalled papers and TBLs | Practice & MCQs → Previous Exams & TBLs, with attemptable sets by course and batch |
| Inactive courses | Archive, with preserved historical progress |

Extend the existing renderer with course data. Keep the same navigation and controls. For areas awaiting source material, use the shared empty state. Source PDFs belong in the Library or behind an assessment’s source link. Keep private assets in approved storage and put only metadata and asset hashes in the public repository.

Before merging a course update:

- Check that registered lecture IDs match the lessons exposed to students and that existing IDs still resolve.
- Exercise direct links, course switching, and shared layouts on phone and desktop. Verify completion, resuming, and keyboard navigation in applicable tools.
- Exercise progress saves and incremental sync with both legacy and new course records in the same account. Confirm unknown IDs are still rejected, separate accounts remain isolated, and unscheduled lessons retain their progress.
- Check archived course state and all protected asset URLs. Verify the published assessments retain printed wording and keys, and mark uncertain keys as self-check only.
- Include the staging evidence in the pull request. The **Course integration and sync** check verifies route delegation, registered lecture coverage, and progress persistence. Keep its fixtures in step with the actual assembled curriculum as courses are added.
