# Cloudflare Phase 3 production preparation

22 November 2026. The production candidate builds from `cloudflare-staging`. The existing staging Worker remains the test environment.

## Build and boundaries

Run `npm run build:production-candidate` and then `npx --no-install wrangler deploy --dry-run --config dist/server/wrangler.json`. The tracked production template accepts only a placeholder D1 binding during this local build. Its Worker name and R2 name differ from staging, and preview URLs, workers.dev and custom routes are disabled. The staging deploy script rejects the production build. GitHub Actions checks both targets with a production dry run. Workers Builds remains connected to the staging branch and staging build command.

Before serving the app, the production Worker requires a Clerk live key pair, a publishable key that identifies the configured issuer and a request to the exact configured HTTPS app origin. It checks Clerk's authorized party against that origin and verifies the account with Clerk before trusting its identity. The source keeps issuer and immutable subject in the account namespace. The existing production Sites Worker uses its existing entry point.

## Fresh database and academic assets

A local rehearsal applied both Drizzle migrations followed by `staging/schema.sql` and `staging/managed-accounts.sql`. All five tables started empty. An encrypted backup of a synthetic account and progress row decrypted into a separate SQLite file, passed the integrity check and returned the same revision. This validates the schema and local backup round trip. The hosted D1 Time Travel and private R2 restore still require a separate rehearsal.

Use the same schema order for a new production D1. Confirm zero rows in the account, progress and personal material tables before opening registrations. For a production backup, capture D1's bookmark and the R2 object inventory together. A D1 restore can leave references to missing R2 objects, so validate uploaded files and large progress payloads as part of the same restore drill. Keep code rollback separate from database rollback.

The following asset inputs were checked locally against the tracked SHA-256 manifests.

| Input | Verified coverage | Destination |
| --- | --- | --- |
| Original curriculum | 660 entries, 655 unique hashes | `site-assets/data/<sha256>` plus verification receipts |
| Study assets | 910 entries and hashes | `study-assets-v1/<sha256>` |
| Six private PDFs | Vlad & Olena and Batch 19 TBLs 1–5 | `publisher-packs/v1/<sha256>` |

The verified staging course and study batches are available under the ignored `.sites-runtime/staging` directory. The six private PDF source locations are in the ignored `phase3-private-originals.json` there. Current client bundles are generated from source. Private media present in the independent build is protected by the Worker. Upload the approved academic files to the new private bucket and verify the destination bytes against the same hashes before launch.

## Hosted acceptance

The chosen hostname is needed to configure the Clerk Production instance, its DNS verification and the exact authorized party. Create fresh D1 and R2 resources after the production setup is authorized. Configure verified email sign-in and production Google OAuth with supported account tools. Set the owner role from a verified production Clerk subject, with the owner entering the separate Admin Settings phrase through a trusted bootstrap.

Before opening the site to students, verify fresh email registration, real Google sign-in, owner and ordinary-student permissions, private resource downloads, cloud sync between devices, iPhone and iPad Safari, offline exam recovery and D1/R2 backup recovery. Use a separate approved domain cutover after those checks. The current ChatGPT Site can remain available throughout.

Provider references. [Clerk production setup](https://clerk.com/docs/guides/development/deployment/production) · [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) · [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
