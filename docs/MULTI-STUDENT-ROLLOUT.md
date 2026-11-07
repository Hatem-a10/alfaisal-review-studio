# Multi-student rollout checkpoint

Existing project `appgprj_6ade126fa77081919dc24e7a87700a9f` at `https://hub.barcman2000.chatgpt.site`. Changes are local. Preserve production sharing, bindings and study data.

## Implemented locally

- The bootstrap verifies the trusted visitor before loading the owner workspace. Only the configured owner can load its legacy browser or Anki cache. Progress requests carry an account marker to detect a stale tab after sign-in changes.
- Student setup has six resumable steps, verified group selection, individual appearance and reporting preferences, and independent historical passes. Students can optionally save Monday/Wednesday or Sunday/Tuesday/Thursday English hours. These personal times remain separate from official schedule events.
- The student dashboard shows verified group events, an individualized catch-up plan, cloud-saved reviews, and a six-week activity grid derived from saved reviews and latest lesson answers.
- Student learning uses concept cards and MCQs assembled from the existing bank. The server checks lecture assignment, withholds answer keys on initial fetch, and saves graded answers per student. Timed mock practice supports lesson selection, reload recovery within the tab, cancellation, server-side grading and idempotent submission.
- The student workspace has cloud grade forecasts, configured and personal countdowns, and a material library with explicit per-group approvals for registry assets or existing owner uploads. Personal grades use revision checks for concurrent changes. Anki import, text/cloze practice and review scheduling use a separate, device-only database for each student.
- Admin access requires both verified owner identity and a short-lived password session. Storage routes enforce admin authorization. The admin directory distinguishes operational activity from consent-gated study summaries. Group configuration manages verified lectures, schedule events and approved documents. Students can delete their own cloud student records.
- Drizzle migration `0002_multi_student.sql` adds only new admin and student tables. The original owner study snapshots, uploads and review records retain their existing structure.

## Validation and launch gates

- Build and automated tests use isolated fixtures. The built Worker was exercised with synthetic identities for account bootstrap, onboarding, protected lesson loading, admin unlock and consent. A local browser completed all six onboarding steps, opened a lesson and successfully graded and saved an MCQ.
- The student UI does not have full parity with the owner's workspace. Student Anki currently displays text and cloze cards. The new timed practice layout is the standard question list. The activity grid counts latest records and can undercount earlier attempts.
- The four section schedules are seeded as application defaults and can be overridden by the admin. The workbook is internally titled CVP 112 and covers Oct 4 through Nov 19, 2026. The import reads worksheet 1 and respects merged section cells. It assigns 51 CVP lessons and the 13 MOL lectures (12–24) listed in the workbook to each section. The source lists some MOL lecture titles by week, without specifying a lecture ID for each timed MOL slot. Those entries remain separate.
- The roster PDFs supply only TBL group codes and their section mappings: M1 has M1–M17, M2 has M18–M28, F1 has F1–F22, and F2 has F23–F37. Student names, numbers and other roster details are excluded. Students choose their own verified TBL and optional lab codes; the PDFs are not used to match a ChatGPT identity to a roster entry.
- The source workbook does not cover earlier or later MOL teaching weeks, and unverified subgroup sessions are hidden. OSPE stays in the official timetable and is excluded from exam/TBL countdowns. Suggested review dates derived from lecture availability are personal planning dates.
- Resolve `REVIEW_OWNER_ID` from the original owner's trusted Sites visitor identity. Use a fresh password entered privately via `scripts/hash-admin-password.py` and set only the salted hash as native Sites secret `REVIEW_ADMIN_PASSWORD_HASH`. Back up appropriate records before applying the additive migration.
- Validate the original owner and the nominated independent test account through actual Sites authentication. Verify progress continuity, isolation and upload denials, approved document access, mobile onboarding, and the admin prompt. The synthetic fixtures do not establish these hosted behaviors. Publish only after the required hosted checks can be safely performed.
