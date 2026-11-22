# Restricted Cloudflare production preparation

The existing staging Worker is the acceptance environment. The original ChatGPT Site remains the live service. The separate production candidate has no Workers preview URLs, no workers.dev address, and no custom routes. Production authorization, provider configuration and launch approval are separate steps.

## Review findings

The staged Admin Control Center already supports server-enforced owner, editor and moderator roles, suspension, Clerk session revocation, audit history, approved shared uploads, academic revisions and opt-in analytics. Existing academic content and question IDs are unchanged. The current candidate runs on Clerk Hobby. A signed first-factor age under ten minutes and a fresh Admin phrase challenge tied to the current session are required for sensitive owner writes. The owner is bound to an immutable verified Clerk subject. Without an independent second factor, compromises of the owner inbox present greater risk. Use a strongly protected inbox and a unique Admin phrase. The prelaunch window closes the app registration route and admits only approved, verified Clerk subjects before account creation or private app access. Configure Clerk Invite-only as well to restrict its own sign-up endpoints.

The Worker verifies a D1 environment marker before signed-in production traffic can read or write. Production has no sample or migrated accounts, and must use its own private R2. The extra marker is a guard against binding mistakes. It does not turn a staging database into an approved production database.

## Provider provisioning after owner approval

| Component | Configuration |
| --- | --- |
| Production Worker | `review-studio-production`. A 503 holding script is present. Keep all routes off until a restricted acceptance hostname is approved. Enable Cloudflare Access for only this Worker before adding a route. Do not connect Workers Builds auto-deploy to the production Worker. |
| Production D1 | Create `review-studio-production`, verify its ID differs from staging, and initialize the empty schema explicitly. Keep a separate disposable database for hosted recovery and synthetic acceptance. |
| Production R2 | Create a private `review-studio-production` bucket with no public access. Verify approved academic payloads by hash after upload. Keep recovery snapshots and disposable restore objects separate. |
| Production Clerk | Create a fresh Production instance for the selected hostname. Enable verified email, allowed recovery methods, Google credentials and Invite-only. Review session expiration and exact app URLs. Use the provider-generated DNS records only with separate DNS approval. |
| Owner | Confirm the verified passwordless email identity. Verify the production user's immutable ID in the Clerk Dashboard. The operator configures that ID and the separate phrase verifier as Worker secrets. No email-based owner fallback. |

Set `REVIEW_STUDIO_ORIGIN` to the exact approved HTTPS app origin. Set `CLERK_ISSUER` to the exact HTTPS Frontend API origin from the production instance. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` there using the live instance. Set `REVIEW_STUDIO_CLERK_OWNER_SUB` and `REVIEW_STUDIO_PANEL_PASSWORD_HASH` through Worker secret management. Use a fresh salted verifier in the app's PBKDF2 format. Reviewer IDs can be provided through `REVIEW_STUDIO_REVIEWER_SUBS` as a JSON array of verified immutable subject IDs, or retained only on disposable acceptance resources. Keep `REVIEW_STUDIO_ACCESS=restricted` and `REVIEW_STUDIO_OWNER_REAUTH=1`. Production secrets and Clerk test identities stay outside Git and chat.

Start the application database with the following approved schemas in order. Use Wrangler's explicit production binding and compare the reported resource ID before executing each migration. The first two Drizzle files are the initial schema and must be applied once for a fresh database. Keep migration receipts separate from release records.

1. `drizzle/0000_huge_gladiator.sql`
2. `drizzle/0001_purple_norman_osborn.sql`
3. `staging/schema.sql`
4. `staging/managed-accounts.sql`
5. `staging/admin-control.sql`
6. `staging/admin-academics.sql`
7. `staging/admin-content.sql`
8. `staging/admin-resources.sql`
9. Confirm zero rows in `review_accounts`, `study_snapshots` and `study_materials`. Apply `production/identity.sql` only to the designated production D1.

## Release and rollback

1. Make and review source changes in GitHub. CI runs the full suite and checks both build targets. Publish approved changes to staging using its existing build connection. Record the tested source SHA.
2. After explicit production release approval, check out the exact reviewed commit with a clean tree. Run `node scripts/verify-reviewed-release.mjs --commit <approved-full-sha> --staging-ref github/cloudflare-staging --repo Hatem-a10/alfaisal-review-studio` using authenticated GitHub CLI access. The manual GitHub Actions gate provides an equivalent dry run once available on the default branch. Run `npm run build:production-candidate`. Use `node scripts/prepare-production-config.mjs <production-d1-uuid> <approved-full-sha>`. The script verifies clean source provenance, rejects the staging ID and bucket, and generates an unrouted configuration beside the Worker bundle. It performs no remote operations.
3. Run a Wrangler dry run using `dist/server/wrangler.production.prepared.json`. Confirm the account and binding IDs independently in Cloudflare. The authorized release operator may then upload the reviewed code version to the designated Worker and deploy that version through Workers Versions & Deployments. Attach a protected hostname only after the Access policy is tested. Record deployment ID, application version, source SHA, database schema version and asset receipt. Do not run migrations from app deploy jobs.
4. Recover an interrupted release by reading the live manifest and Worker deployment history before retrying. Retain the prior Worker version. Revert code to a compatible version through the deployment history. Restore data only through the separate approved recovery process. Public registration needs a new explicit launch approval, plus coordinated Cloudflare Access and Clerk changes.

## Observability and cost limits

Production keeps Worker error logging enabled with request invocation logs and traces disabled to avoid capturing sign-in URLs or authentication parameters. Existing Admin analytics records coarse failed sync and upload events. Monitor Worker 5xx and CPU, D1 rows and storage, R2 operations and storage, and sync failures. Review the first week daily and set a Cloudflare account-wide budget alert before opening traffic. A Workers spending limit applies account-wide and can stop staging too. R2 charges sit outside the Workers cap.

The app caps ordinary production personal uploads at 20 attempts per UTC day and progress writes at 600 per hour per account. Existing per-file sizes still apply. These are request limits. Monitor retained R2 history and review orphan inventories when usage rises. A hard aggregate byte quota and automated orphan cleanup are outside this restricted candidate. Never expire all objects under the active progress prefix.

The approved base is USD 5/month for Workers Paid, USD 0 for the Free DNS zone, and USD 0 for Clerk Hobby while within its limits. R2 Standard includes 10 GB-months, 1 million Class A and 10 million Class B operations in the free allowance. The academic payload is about 464 MB before backup and account storage. Workers Paid provides a 30-day D1 Time Travel window. Metered usage and registrar renewal are additional.

[Clerk plans](https://clerk.com/pricing) · [Production setup](https://clerk.com/docs/guides/development/deployment/production) · [Production Google sign-in](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google) · [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [D1 recovery](https://developers.cloudflare.com/d1/reference/time-travel/) · [R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [Budget controls](https://developers.cloudflare.com/billing/manage/spend-management/)

## Evidence and launch gate

See [asset transfer](ASSET-TRANSFER.md), [recovery drill](RECOVERY.md), and [physical-device acceptance](ACCEPTANCE.md). The current outcome is **NO-GO for public launch**. The selected hostname is `alfaisal.review`. Hosted acceptance is blocked on registrar confirmation and propagation, Clerk DNS verification, Google OAuth, owner enrollment and approval to attach a protected route. Keep synthetic hosted tests in disposable namespaces and verify zero student and progress rows in the intended launch database. Rehearse owner first-factor reauthentication, public student signup and recovery, both account types, and live D1/R2 recovery before launch approval.
