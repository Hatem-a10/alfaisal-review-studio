# GitHub source copy

This private repository starts from the Review Studio v1.65 source. It does not move hosting or deploy anything. The existing Sites project identity, D1/R2 bindings, manifests, question IDs, and asset references are retained.

## Safety and history

The owner approved a separate sanitized GitHub copy. The original local checkout and published Site were left untouched. The historical owner student-number literal was removed and an obsolete browser admin-password digest was neutralized in this copy. The current server-side admin verifier and secret environment bindings were not changed. Git history topology and source evolution are retained; affected commit hashes necessarily differ. The local filter-repo commit map retains the original-to-sanitized mapping and is not uploaded.

Only main is pushed. Local experimental and backup branches are not published to GitHub. Runtime credentials, local environment files, dependencies, builds, development state, personal backups, database dumps and account-progress exports are excluded. Checked-in SQL files are schema migrations, not user database exports. Migration snapshots are schema metadata. Course materials and academic diagrams already tracked by the application remain included; private live R2 contents are not exported.

## Development

Use Node.js 22.13 or newer and install dependencies with the existing lockfile/package-manager workflow. Run the development script with `node scripts/run-framework.mjs dev`, tests with `node --test tests/*.test.mjs`, and build with `node scripts/run-framework.mjs build`.

Some production resources are loaded from existing private D1/R2 services. A clone does not include production credentials, account records, uploaded private files or database contents. Configure authorized runtime bindings through the supported Sites workflow, not through committed environment secrets. Review AGENTS.md and docs/DEPLOYMENT.md before any later publication. A GitHub push alone does not deploy this Site.

## Import verification

- Original production source: v1.65; exact source checked against native Sites provenance.
- Original repository: 184 commits across all audited local refs; 2,990 unique historical blobs scanned, plus current tracked source and document contents.
- Gitleaks: 38 historical findings manually classified as medical identifiers or deterministic synthetic test fixtures; no confirmed active credential found. Additional scans found the owner number and obsolete client password digest, removed in this copy.
- Original baseline full suite: 346 checks, 331 passed / 15 failed. Failures are recorded in TEST-BASELINE.md; no all-green claim is made.
- Original production build succeeded. No live account or database was used for testing.
