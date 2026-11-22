# Production acceptance checklist

This checklist is for the isolated production candidate. It does not authorize a DNS change, public registration, production database creation, or deployment. Record the date, device, browser version, account type, and result beside each item. Use disposable test accounts and synthetic records until the owner explicitly approves launch.

## Physical iPhone Safari

- [ ] Open the staging URL in a private Safari tab on the target iPhone. Confirm the Clerk sign-in page, app title `Review Studio`, and no browser-console error visible to the user.
- [ ] Register a disposable student with verified email code. Confirm the six onboarding steps, the review-progress Skip action, zero initial overdue work, group/lab selection, English schedule, accent, and theme.
- [ ] Close and reopen Safari. Sign in again and confirm the same profile and progress return without onboarding repeating.
- [ ] Check Dashboard, Learn & Master, Schedule, Practice & MCQs, Timed Mock, Booklet, Study Activity, Anki, Material Library, Grade Calculator, and Settings. Confirm no horizontal clipping, inaccessible close buttons, or scrolling behind dialogs.
- [ ] Complete one practice question, one booklet item, one Anki rating, and one small timed mock. Confirm the score, review state, and unanswered behavior after refresh.
- [ ] Go offline from Control Center. Open already-cached study content, answer a safe synthetic item, then reconnect. Confirm queued progress syncs once and the status returns to Cloud saved. Do not interpret unavailable shared resources as a sync failure.
- [ ] Sign out, sign in as a second disposable account, and confirm the first account's progress, Anki deck, profile, and private files are absent.
- [ ] As a normal student, verify Admin Settings and Admin Control Center are unavailable, including by directly opening their API paths.

## Physical iPad Safari

- [ ] Repeat the sign-in, onboarding, return-login, and account-isolation checks in portrait and landscape.
- [ ] Repeat the schedule, Examplify, booklet, Anki, and settings checks in Split View or a reduced-width multitasking layout.
- [ ] Confirm dialogs, tables, filters, keyboard focus, upload controls, and the Admin Control Center do not exceed the safe area or become unreachable after rotation.

## Hosted production-candidate checks

- [ ] Verify the production Worker is protected by Cloudflare Access or an equivalent launch gate until registration is intentionally opened. A public `workers.dev` response is not launch evidence.
- [ ] Verify production Clerk uses its own issuer, publishable key, secret, authorized origins, redirect URLs, verified email delivery, Google OAuth, recovery path, session duration, and owner reauthentication. Confirm none match staging secrets or identities.
- [ ] Create a fresh production D1 and private R2. Before enabling registrations, verify zero rows in account, progress, personal-material, and private-deck tables. Keep production resource IDs separate from staging IDs.
- [ ] Provision the owner from the verified production Clerk subject. Confirm a matching name, email, student number, or Admin phrase alone cannot grant ownership. Test owner step-up and recent email-code verification for role, suspension, resource, academic, report, site-control, and backup operations.
- [ ] Run the complete suite, staging-specific tests, production-candidate build, Cloudflare compatibility check, and Worker dry run. Preserve the test logs with the release record.
- [ ] Transfer only approved academic assets. Verify SHA-256 and byte size after upload, compare the destination inventory with the approved manifest, and confirm no personal uploads or historical progress were copied.
- [ ] Run a restore drill using a separate test D1 and R2 namespace. Restore a synthetic account, progress snapshot, and sample objects, then verify checksums, foreign-key integrity, account isolation, and missing-object detection. Keep production resources read-only during the drill.
- [ ] Test account switching, two-device progress reconciliation, large progress payloads, a long offline interval, reconnect retries, cancellation, and a stale-device conflict. Confirm newer server state is never overwritten by stale offline state.
- [ ] Confirm audit records contain the actor, role, target, action, timestamp, and result without passwords, tokens, private documents, answer history, or raw backup data.
- [ ] Confirm rollback to the previous Worker release is available and database migrations are reviewed and run separately from application deployment.

## Evidence and launch gate

Browser emulation at 390×844, 834×1112, 1112×834, and desktop widths is useful for layout regression, but it does not satisfy the physical-device items above. Mark each physical item only after it has been performed on hardware. The launch decision remains **NO-GO** until production Clerk, D1, R2, owner reauthentication, backup/restore, real-device checks, and explicit owner approval are complete.

Record the final evidence in the release report:

| Evidence | Location or reference | Result |
| --- | --- | --- |
| Full automated suite | CI run URL and retained log | Local candidate verified. Use final approved release CI for hosted acceptance. |
| Staging API isolation | Synthetic account smoke log | 28 admin checks on deployed baseline and 16 fresh synthetic-account API checks during preparation |
| iPhone Safari | Device/date/build | Pending owner run |
| iPad Safari | Device/date/build | Pending owner run |
| D1/R2 restore drill | Isolated resource IDs and checksums | Local D1/R2 bindings passed. Hosted drill pending. |
| Production Clerk and owner verification | Provider configuration and test-account IDs | Pending owner setup |
