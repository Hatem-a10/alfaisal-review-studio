# Admin Control Center

The control center runs on independent Cloudflare deployments. Use synthetic accounts in staging and preserve the separate production D1 and R2 bindings.

## Roles and access

| Role | Access |
| --- | --- |
| Owner | All sections, student account operations, grants, revision approval, site controls |
| Content Editor | Shared resources, report review, correction proposals |
| Moderator | Report triage, announcements |
| Student | Own study account, approved resources and notices, own reports |

Clerk verifies the session and subject. The deployment's immutable owner subject determines ownership. D1 assigns and revokes staff roles. The Admin phrase unlocks owner settings and provides a ten-minute, current-session challenge for owner writes. The challenge supports recent second-factor enforcement through `REVIEW_STUDIO_OWNER_REQUIRE_MFA=1` after the owner enrolls with Clerk. Site controls use same-origin POSTs. Changing the owner subject, the phrase verifier or MFA policy requires normal secret management outside the browser.

The older account-directory endpoint is retired in managed deployments. Account views show identity, assignment, dates, onboarding, status and storage totals. They do not return private document listings, snapshots, individual answers or Anki content. Suspension blocks server access, including previously signed-in sessions. Session revocation uses Clerk's session API. Restoring access is independent from restoring a revoked session. An onboarding reset asks the student to revisit their profile and leaves academic results and existing files intact.

## Academic publishing and moderation

Use Academic Management to preview and validate a draft, publish it, or restore an earlier revision. Assignments and targeted notices use the effective class, section and lab group. Overrides are reversible and preserve existing study history. Schedule changes require verified time and audience details, and overlapping entries are rejected.

The resource catalog stores approved PDFs, images and Anki packages in private R2. It detects duplicate active uploads by SHA-256, records replacements, supports archival and checks registered objects for missing links. Student access uses authenticated downloads. Existing academic assets continue through their existing catalog paths.

Report Question is available in question views, including Examplify, with no answer disclosure during an active exam. Approved wording and explanation updates are visible in question review. Changes to choices and correct answers are recorded for a reviewed question-bank release, so a correction cannot change an existing attempt's scoring key.

Announcements can be drafted, previewed, scheduled, updated and archived. Delivery is filtered by the student's verified assignment and the publication window.

## Analytics and operational data

Study counts are off by default and the server checks current consent on every refresh. The dashboard suppresses study totals for cohorts with fewer than five participating accounts. Operational counts and report categories are aggregate. Audit entries store role, operation, target reference and time, with a 90-day application retention window.

The storage dashboard distinguishes registered shared files, personal file totals, logical progress bytes and sampled R2 object sizes. Large listings disclose partial coverage. Unmatched objects are candidates for investigation. The dashboard has no deletion or restore operation. Provider-wide metrics, historical growth, encrypted backup jobs and verified restore receipts require separate configuration and operational authorization. Backup receipts report status only after an external job records a verified result for the current environment.

## Staging schema

Apply the additive scripts in order to the existing staging database after the Phase 1 and 2 schemas. They may be rerun.

1. `staging/admin-control.sql`
2. `staging/admin-academics.sql`
3. `staging/admin-content.sql`
4. `staging/admin-resources.sql`

Roll back code through the staging Worker deployment history. Keep additive tables and archived R2 revisions for later investigation. Production uses its own Clerk instance, D1 and private R2. Its approved owner policy requires recent first-factor verification and the separate Admin phrase. Any change to that policy requires owner approval. See the [release runbook](PRODUCTION-READINESS.md) for recovery and production verification.

### Student account details

The Students view shows registration, onboarding and academic group. **View account** opens the Clerk profile photo and up to ten recent sign-ins with device and browser labels when supplied by Clerk. This owner-only, audited view excludes IP addresses, location, raw identifiers for sessions, private files and study answers.

**Edit information** lets the verified owner correct a Review Studio display name, student-number override, class, section, verified lab group and English schedule. Corrections are a reversible overlay. Clerk email, identity and permissions stay separate. **Clear group correction** removes only the group fields. **Clear profile corrections** returns all fields to the student's selections.

Estimated active time is recorded for all signed-in students. It counts minutes with recent input in a visible, focused tab while online. Concurrent tabs count at most one minute per account per clock minute. The study-totals preference applies to completed reviews and answered-question counts. Earlier time and offline sessions are outside this estimate. Existing D1 JSON fields support this update without a schema migration.

### Course archive and active workspace

**Site Controls → Archive CVP 112 and show REN 123 as the current course** is enabled by default during the Renal transition. It moves CVP study surfaces to **Archive** while retaining their original lesson, question, and material IDs. CVP has no active review due dates in archive mode. Turning the setting off restores the previous course navigation and scheduling. Existing review timestamps, booklet attempts, files, and grades are retained.

REN 123 currently uses the verified autumn timetable, academic group rules, and official final and OSPE events already registered in the app. The first ten Renal sources are listed in [the source intake](../content-audits/renal-source-intake.md).
