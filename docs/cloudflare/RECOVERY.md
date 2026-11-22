# Production recovery procedure

The production Worker, D1 database, R2 bucket and Clerk instance must be created separately from staging. Normal application deployment never runs schema migrations, deletes R2 objects, or restores data. Keep the previous Worker version available for code rollback while database recovery remains a separate, approved operation.

## Local recovery evidence

Run the synthetic rehearsal from the repository root:

```sh
node scripts/production-recovery-drill.mjs
```

The drill starts an isolated local Worker with synthetic D1 and R2 bindings, applies the production schema, and backs up one synthetic account, a progress snapshot, a private material reference, and three R2 objects. It encrypts the rows, inventory, and object bytes using AES-256-GCM, disposes of the source, and restores into fresh local bindings from the encrypted package. It checks the database, foreign keys, account scope, progress revision, all object hashes and tamper rejection. All data and the one-time key are discarded afterward.

The rehearsal verifies recovery using local Workers bindings. The hosted D1 Time Travel and R2 restore still require a drill against approved disposable resources. Verify both restored rows and every R2 object they reference.

## Production runbook

1. Freeze writes through the maintenance control and record the application release, D1 bookmark and R2 inventory timestamp.
2. Export D1 using Cloudflare’s supported backup or point-in-time recovery workflow. Record the database identifier, bookmark, checksum and operator. Do not place the export or credentials in Git.
3. Inventory R2 objects referenced by the selected snapshot, including large progress objects, personal material originals and metadata, shared decks and academic assets. Record key, size, SHA-256, content type and the inventory time. Include personal content only within the approved encrypted production backup policy. Never include it in the academic transfer bundle.
4. Encrypt the database export and manifest before leaving the provider’s controlled storage. Store encryption keys separately from the backup and restrict access to the owner’s operational account.
5. Restore into a separate disposable D1 database and R2 bucket. Import a full SQL export into an empty D1 database using Wrangler. Do not pre-create tables for a full export. Apply reviewed migrations separately for an older backup only after the recovered version is identified. Restore object bytes and HTTP metadata from the encrypted archive and verify their references. Run integrity checks, account-isolation checks, a progress revision check and a representative resource download.
6. Record the restore result, checksums, object count, database size, elapsed time and any missing references. Retain the receipt and keep test data isolated. Disposal of hosted test resources requires separate approval.
7. Roll back application code through the Worker deployment history if the release is defective. Roll back data only through the separately approved D1/R2 recovery procedure. If a deployment was interrupted, compare the active Worker version and build commit with the approved release before retrying. Select the last compatible version if needed and verify bindings, health and a read-only sync check. Reopen writes after verification.

The current staging Admin Control Center reports backup receipts and R2 orphan candidates but does not expose deletion, restore, raw D1 queries or provider credentials. Production setup remains **NO-GO** until the owner creates the separate paid resources as needed, configures Clerk Production and first-factor reauthentication, sets retention and monitoring, completes the isolated restore drill, and approves launch.
