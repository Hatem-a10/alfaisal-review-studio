# Independent Cloudflare staging — Phase 1

## Isolation

Branch: cloudflare-staging. GitHub main and the ChatGPT Site remain unchanged. Independent Worker review-studio-staging-20261117, D1 review-studio-staging-20261117 (1540bad8-aa39-4c73-9484-28cfd5ea2a05), and private R2 bucket review-studio-staging-20261117. No custom domains or routes. No production database, bucket contents, identity tokens, student records or account secrets were read/copied. Database migrations are explicit staging-only operations, never part of a normal code deploy.

## Application inspection

Next16.3.4 API surface; React19.2.6; vinext1.0.0-beta.5; Vite8.0.13; Cloudflare Vite plugin1.37.1; Wrangler4.92.0. Node>=22.13 (tested24.22.1). App Router wraps a large existing static JS application with24 server route handlers. vinext check reports all2 Next imports and all5 recognized libraries supported;2 browser-only vendored UMD libraries contain guarded CommonJS globals. These files are served as browser assets, not imported as Worker modules. Independent multi-environment Workers build passes; OpenNext is not needed for this phase.

Existing APIs cover revision/CAS/PATCH progress sync, personal materials, decks, shared decks, private curriculum resources, academic configuration, account capability and admin checks. study_snapshots and study_materials are the two base D1 migrations. staging/schema.sql adds only review_academic_groups; authentication creates its staging rate-limit table. Progress larger than1.5MB remains in the staging R2 bucket behind D1 references. Existing object prefixes and requestOwner checks are preserved but point only to new bindings.

## Authentication

Sites injects oai-authenticated-user-* headers at its own boundary. That boundary and its /signin-with-chatgpt service are not portable. An independent Worker must strip client-supplied versions of these headers before dispatch; it may re-add them only after verifying an independent session.

Staging uses exactly two synthetic accounts (staging-admin and staging-student, @example.test). Salted PBKDF2 passwords are randomly generated; sessions are HMAC-signed, HttpOnly/Secure/SameSite=Lax cookies, expiring after8hours. Login has same-origin checks, bounded requests, D1-backed throttling, timing normalization and local redirect checks. Current hosted Workers limit PBKDF2 to100000 iterations even though installed local workerd accepts310000; staging uses100000, with long random test passwords. Production admin authentication code was not altered. The administrator is authorized by a synthetic owner account hash, never the production owner secret. Header spoofing, cookie tampering and cross-account access are tested.

Secrets: REVIEW_STUDIO_STAGING_ACCOUNTS, REVIEW_STUDIO_STAGING_SESSION_SECRET, REVIEW_STUDIO_OWNER_ACCOUNT_KEY. No production secret was copied. Generate locally with scripts/create-staging-secrets.mjs; output remains in ignored .sites-runtime/staging and .dev.vars. Upload only to the named staging Worker using Wrangler secret bulk. Do not paste credentials into GitHub or chat. This is test authentication, not a student-account migration solution.

For production use a managed OIDC provider (or carefully configured Cloudflare Access if its account/lifecycle model fits). Use verified issuer/audience/signature checks and an immutable subject mapping. Migrate with a separate audited account-link table and explicit proof of both old and new identities, encrypted exports, dry-run counts, collision checks and rollback. Never match records merely by display name or silently bulk-copy identity IDs. Owner approval and live student/cross-device verification are required before a production migration.

## Build and storage

npm run check:cloudflare runs compatibility. npm run build:staging uses the independent Vite config and Worker. npm run deploy:staging refuses mismatched Worker/database/bucket names or custom routes. Existing Sites build/entry/manifest are retained. The staging builder never trusts Sites R2 cleanup proof files: it keeps required local curriculum assets as guarded Workers assets until staging copies exist. Private curriculum/media access runs through the Worker before static serving, including encoded paths; personal uploads still use staging R2. No live private R2 contents were copied.

Curriculum originals available in the source copy remain private to signed-in staging users. Resources absent from the source/archive may remain unavailable until separately supplied or migrated with authorization; do not proxy the production bucket or claim those files were copied. Public question data needed for startup stays available from the independent build. R2 handles synthetic uploads and large progress during tests.

## GitHub and builds

GitHub validation runs on cloudflare-staging pushes/PRs: staging security tests, independent build, compatibility report and the existing full suite. The complete369-test suite now passes after the reliability audit in TEST-REPAIRS.md. Full-suite failures fail CI; logs are retained as artifacts. No workflow contains deployment credentials or a production deployment. Main remains the stable source branch.

Connect Cloudflare Workers Builds only to this Worker and cloudflare-staging as its deployment branch. Build: npm run check:staging && npm run build:staging. Deploy: npm run deploy:staging. No automatic schema migration command. Keep additional branch builds disabled for Phase1. Updates are reviewed through a PR into cloudflare-staging, then previewed at the staging URL. Future production integration requires separate config/resources/approval and is not enabled here.

## Verification / next steps

See QA.md for actual results, remaining gaps and the deployment receipt. Before any production move: choose real authentication, audit identity/data export mapping, transfer authorized R2 assets with hash checks, establish backups/rollback, resolve baseline test failures, verify real iPhone/iPad and cross-device sessions, configure monitoring/cost limits, and obtain explicit cutover approval. No Porkbun/DNS change is part of this phase.
