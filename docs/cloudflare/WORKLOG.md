# Staging handoff — 17 November 2026

Phase1 implemented on cloudflare-staging. Read PHASE1.md for architecture/resources and QA.md for exact evidence and limits. Existing production Site, original checkout, main branch, identities, D1/R2 and domain remain untouched.

Latest verified application commit:8dd2176. Subsequent changes add QA records and rename the new startup test into the required staging test glob. GitHub Actions/Workers Builds deployed application commit8dd2176 successfully; Wrangler recorded Worker version56914510-0018-41fe-a57d-e17ce69541b0. Use the latest check runs rather than assuming a push deployed.

Staging: https://review-studio-staging-20261117.hatema2169.workers.dev

Generated test logins are in ignored .sites-runtime/staging/credentials.json, not in source or chat. Do not use real ChatGPT credentials on staging. No production identity migration is configured.

Completed: independent vinext build/config; separate DB/bucket/Worker; synthetic signed sessions; server-side role/account isolation; official GitHub Workers Builds restricted to staging branch; private local curriculum import with all660 SITE_ASSETS and910 STUDY_ASSETS verified; live API/storage/browser/offline checks; bounded fixes for static routing, mobile exam menu and deferred heart/Anki startup.

Tests: final Linux full suite361 total346 pass15 pre-existing fail. Required staging authentication/config/startup checks pass. Build passes. Known failures remain visible in CI artifacts rather than hidden as success. See QA.md; this is a tested staging deployment, not approval for production migration.

Resume before any production migration:
1. Review real independent authentication provider and explicit immutable account-link plan.
2. Resolve baseline tests and post-final onboarding capacity warning; physical Safari and real cross-device/offline exam QA.
3. Audit production-specific document associations and owner/student uploads separately; do not copy student data without the controlled migration plan.
4. Establish encrypted backups/restore drill, rollback and monitoring/cost limits.
5. Obtain explicit production cutover approval. Do not change DNS/Porkbun or deploy staging auth into the current Site.

Evidence scripts, synthetic fixtures, credentials, cookies, screenshots and import receipts stay local under ignored .sites-runtime/staging. Never commit them.
