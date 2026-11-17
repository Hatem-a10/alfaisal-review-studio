# Phase 2 — independent authentication and fresh accounts

17 November 2026. Branch: `cloudflare-staging`. Staging only; original ChatGPT Site, `main`, production D1/R2, DNS and Porkbun remain untouched.

## Current architecture

Clerk Development manages registration, verified email-code/passwordless login and recovery, Google, persistent sessions and logout. Passwordless login avoids a separate password-recovery system. The official Backend SDK verifies signed session tokens, the exact issuer and staging authorized party, then checks active sessions, verified primary email and account lock status. Successful Backend API lookups are cached for at most 15 seconds; revocation can take that long to propagate. Client identity/owner headers are stripped before dispatch. Missing configuration fails closed.

Every identity gets an issuer-and-immutable-subject namespace. Progress, personal materials/decks and local IndexedDB are scoped to that identity. Before hydration, the device verifies `/api/account-key`; a new managed identity never inherits raw legacy localStorage. A cached signed-in account can study offline; explicit logout locks cached personal study until verified sign-in. Offline access cannot provide instant remote revocation on a disconnected device.

Clerk was selected for managed email verification, passwordless recovery, Google and official Workers-compatible SDK support with a free development tier. Supabase was considered, but its default hosted email rate limit requires separate SMTP for practical student registration. Recheck provider pricing/quotas before production.

## Owner and administrator controls

The owner completed a local, trusted bootstrap after verifying the new primary email and immutable Clerk ID. Only that exact server-side subject receives owner privileges. Names, email resemblance, client claims and a known Admin phrase cannot elevate another student.

Admin Settings retains a separate salted PBKDF2 phrase check, five attempts per 15-minute window. The verified owner must unlock it; unlock is remembered for that new account in D1. User entered the phrase locally, never through chat or Git. The local helper now verifies through Node HTTPS because Python urllib requests were rejected with HTTP 403. Verification and cancellation were exercised before rerun; bootstrap does not change progress.

Registered students lists basic disclosed registration/profile information and account access status. The owner can disable/restore other accounts; self-disable is rejected. Shared material/deck and academic configuration gates retain their server-side owner checks. Ordinary students cannot publish shared uploads. Cloudflare resource administration remains in its secured dashboard; no cloud credentials are exposed to the app.

Aggregate study sharing is optional and off by default. The directory never returns private question answers, progress snapshots, private uploads or decks. Opting out clears shared aggregate totals without removing personal records. The disclosure is available at `/auth/privacy` and in Site Settings.

## Database, storage and onboarding

The existing isolated staging D1 and private R2 are retained. `staging/managed-accounts.sql` was explicitly applied to staging only, adding account metadata and Admin phrase throttling tables. No account/progress imports and no destructive schema operations. Normal code deployments run no migrations.

The six-step wizard is reused: Welcome, academic/profile information, appearance, optional manual first/second/third-review selection, plan, completion. M1/M2/F1/F2, sections, verified lab group options and English days/time remain available. The managed-account guard removes legacy-owner defaults; restored new profiles retain their chosen settings. A synthetic account completed the wizard with Skip and displayed **0 overdue** and 0 completed reviews. With the CVP final tomorrow, capacity warnings remain visible rather than pretending every review can fit.

All 660 curriculum assets and 910 study assets remain in staging; none was unnecessarily reuploaded. Heart model retrieval was checked against its exact existing SHA-256. Existing source IDs, questions, figures, keys and scoring are unchanged. Original-account records were not read or migrated.

## Verification

- Complete automated suite: **396 passed, 0 failed, 0 skipped** (369 original baseline plus 27 new regressions).
- New tests cover signed-token validation with real SDK crypto, invalid issuer/party/expired/tampered tokens, session revocation/cache, verified email, spoofed headers, owner identity, CSRF, clean independent D1 accounts, student Admin rejection, phrase hashing/throttling, account access controls, privacy opt-out, fresh profiles, local-account isolation and logout/offline storage gating.
- Live API: **14 checks passed** using only synthetic Clerk Development accounts and staging data: empty progress; independent account keys; D1 save; cross-account read isolation; no student Admin capability; phrase cannot elevate students; directory forbidden; analytics default off; exact private curriculum checksum; forged identity headers rejected; personal Anki upload; other-student deck access denied; shared upload denied; revoked session rejected after bounded cache.
- Synthetic API fixtures consume official one-use sign-in tickets through a new Frontend API dev client with the staging Origin. Backend-created session tokens without an authorized-party claim correctly fail; the application was not weakened to accept them.
- Browser: email registration + fixed Development test-code verification reached onboarding; profile/group selection, review Skip, dashboard and cloud up-to-date status worked. Owner completed verified registration/onboarding/phrase unlock and opened Registered students. Student logout returned to the managed sign-in page. A returning-account browser test exposed an unchanged-response onboarding loop; same-account verified local profiles now restore without reopening setup, with two regression guards.
- Storage diagnostics: fixed a null publisher-report crash when a standalone build has no Sites fingerprint. Unknown sizes now remain unavailable rather than displaying NaN.
- Production build, staging build and vinext compatibility are checked separately. Compatibility retains the previously documented browser-only vendored UMD warnings; the local checker also scans ignored npm CLI tooling, which is not part of the Worker bundle or GitHub source. All 2 Next imports and 5 recognized libraries are supported.

## Configuration and repeatable deployment

Secrets remain outside Git under ignored `.sites-runtime/staging` or encrypted Wrangler storage: Clerk public/secret key, exact issuer/origin, auth-provider switch, owner subject and salted Admin phrase digest. Never paste keys, cookies, tickets or phrases into chat. Only the publishable key is returned to the browser. The official Clerk CLI is linked to the existing Development app; no replacement app was created.

Existing Workers Builds targets only this Worker and `cloudflare-staging`; GitHub Actions requires the full suite. A push is not proof of deployment: confirm both terminal checks and deployed bundle. Deployment receipts are recorded in QA.md.

## Before production

1. Obtain explicit production approval; retain the original Site throughout.
2. Create separate production Clerk/D1/R2 resources. Configure production email delivery, Google OAuth, domains and exact authorized party. Disable Development test identities/test-code behavior; recheck quotas and provider costs.
3. Start every production personal account empty. Do not import legacy student identities, progress, private uploads or decks; do not build mapping/reconciliation tools. Optional manual onboarding review selection remains.
4. Transfer only approved academic assets/catalogs to production R2 with SHA/size verification. Existing production-only personal document associations are deliberately absent.
5. Verify physical iPhone/iPad Safari, real cross-device refresh/logout, extended offline exams/reconnect and backup/restore. Current responsive checks are browser emulation, not hardware proof. Verify Google with the final production OAuth configuration.
6. Set up encrypted backups/restore drill, rollback, monitoring and cost limits before any domain/cutover action.

Official references: [Clerk JS setup](https://clerk.com/docs/js-frontend/getting-started/quickstart), [server verification](https://clerk.com/docs/reference/backend/authenticate-request), [Development test emails](https://clerk.com/docs/guides/development/testing/test-emails-and-phones), [Clerk pricing](https://clerk.com/pricing), [Supabase email limits](https://supabase.com/docs/guides/auth/rate-limits).
