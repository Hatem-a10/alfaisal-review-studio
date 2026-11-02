# Review Studio: local checks + native Sites publishing

Verified 2026-11-02. This is the existing Site, not a replacement:

- URL: https://alfaisal-review-studio.barcman2000.chatgpt.site/
- Project: `appgprj_6ade126fa77081919dc24e7a87700a9f`
- Manifest: `.openai/hosting.json`; preserve `d1: DB` and `r2: BUCKET`.
- Local checkout: `/Users/hatemalabrach/Documents/Codex/2026-10-25/referenced-chatgpt-conversation-this-is-an/outputs/review-tracker`

## What is and is not supported

The official Sites docs describe publishing in ChatGPT web/desktop and explicitly say the Codex CLI/IDE has no standalone Sites management view. No public REST deployment API, permanent Sites CLI login, or generally enabled push-to-deploy contract was found. The installed official Sites plugin does provide native source-credential and save/deploy operations, plus a local helper for source synchronization and packaging. Its Git source repository is not, by itself, an independent deployment service.

Sources:
- https://learn.chatgpt.com/docs/sites/creating-a-site
- https://learn.chatgpt.com/docs/sites/publishing-and-sharing
- Installed official Sites instructions: `~/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/skills/sites/SKILL.md`

An ordinary ChatGPT conversation may use **Chat On Steroids for local Terminal/files and the native Sites connection for publication** when both toolsets are available there. Sites is installed/enabled on this account. That does not establish which tools a different conversation exposes. Terminal access alone cannot invoke the native Sites tools. If the chat cannot obtain the official Sites credential or save/deploy tool, stop at local preparation and use a Sites-enabled conversation. Do not replay browser requests, extract cookies, invent endpoints, or promise that a shell-only deployment succeeded. An OpenAI API key or Cloudflare token is not configured as a substitute.

## Commands

From the checkout:

```sh
./scripts/review-studio-release check
```

Runs all checked-in Node regression tests, builds, and verifies source and built project/storage identities. It does not publish, migrate a production database, or upload materials. The wrapper uses Node on PATH or the existing bundled local Node runtime. Dependencies must already be installed.

```sh
./scripts/review-studio-release open
./scripts/review-studio-release prepare
./scripts/review-studio-release status
```

`open` and `prepare` require fresh JSON from the authenticated **native Sites connector**, sent through hidden stdin, not a shell argument, command substitution, environment variable, file, or log. They are assistant orchestration steps, not standalone credential/login commands. Never ask the user to paste a credential manually. The script announces when stdin is ready and masks Terminal input before accepting it.

- `open` input: `{ "credential": <native source credential object> }`. Returns an opening receipt with project ID, checkout path and commit SHA. Open/synchronize before editing. It refuses divergent history; do not force-push.
- `prepare` input: `{ "credential": <fresh native credential>, "source": <opening receipt> }`. Runs tests/build, uses the installed official helper to commit/push approved changes, packages the exact build, and returns `project_id`, `commit_sha`, `archive`, `published: false`.
- **Preparation stages all nonignored changes** through the official helper. Review `git status`/diff first; preserve unrelated edits separately instead of accidentally publishing them. Do not run concurrent edits during preparation.
- The archive is a sibling folder `../review-studio-releases/`, outside the source tree. Non-secret receipts/lock live under ignored `.sites-runtime/release/`. Credentials are never written there.
- `REVIEW_STUDIO_SITES_PLUGIN` may select another absolute installed official Sites plugin root after an upgrade. No helper is downloaded or vendored by this script.
- `publish`/`deploy` modes deliberately fail with an explanation. They are not functional Terminal publishing commands.

## Assistant: exact end-to-end procedure

1. Read `AGENTS.md` and current official Sites skill; check local changes. Call native Sites `get_site` for the exact existing project. Preserve owner-only access, URL, DB/BUCKET bindings, runtime values and all user data. This wrapper intentionally targets the currently owner-private Site; if the audience changes, re-read the official skill and use the correct supported native operation. Do not change sharing to satisfy the wrapper.
2. Call native `create_source_repository_write_credential` for that same project. Do not opt into automatic publish-on-push for this explicit workflow. Keep the response in session memory. If an existing automatic publication window is active, reconcile it through Sites rather than mixing the two publishing methods. Never inspect browser cookies or credentials.
3. Launch `./scripts/review-studio-release open` in a retained PTY. Wait for “Ready for native Sites JSON”; send `{credential}` as a single newline-terminated stdin write. Keep the returned opening receipt in memory. Use the connector's own structured execution tool to pass JSON safely; do not interpolate secrets into shell code.
4. Edit the local project through Chat On Steroids, reviewing only intended changes. Preserve stable lesson/question identifiers, progress and storage. Refresh the short-lived source credential when needed.
5. Launch `./scripts/review-studio-release prepare` in a retained PTY; send `{credential,source}` through hidden stdin. Wait for success. The official helper validates/pushes the exact Git state; errors are not deployments. No production migrations run.
6. Pass **only** the returned `project_id`, `commit_sha`, `archive` to native `save_version_and_deploy_private`. This Site's owner-only audience must have been confirmed. These are conceptual native operation names; use the exact tool names exposed in the current chat. There is no shell/curl equivalent configured.
7. If the native result is pending/building/publishing, poll `get_deployment_status` with the returned deployment ID until terminal. On success, verify the returned URL is the existing Review Studio URL. Retain a returned saved version ID on failure; retry deployment of that version rather than saving duplicates. Never say published on Git push or receipt creation alone.
8. Optionally run `./scripts/review-studio-release record` with `{ "commit_sha": <prepared SHA>, "deployment": <successful native result> }` on stdin. This stores a non-secret audit receipt; it does not independently authenticate or poll the deployment. `status` shows what was prepared and the last native result recorded.
9. Re-read `get_site` to verify audience/identity remained unchanged. Record the test result and deployment ID in the local verification report. Keep the archive unchanged until saving succeeds. Retain it for rollback/version recovery as desired; do not ship original lecture PDFs in the package.

If interrupted after a native deployment starts, inspect that same deployment before initiating another. If a release lock survives a process crash, confirm no release process remains before removing only `.sites-runtime/release/lock`.

## Future ChatGPT prompt

> Change [describe feature] in my existing Review Studio. Use Chat On Steroids to edit the local checkout, follow AGENTS.md and docs/DEPLOYMENT.md, run scripts/review-studio-release, and use the authenticated native Sites tools to publish the exact prepared commit/archive. Preserve the existing Site URL/project, DB/BUCKET, user data and owner-only access. If Sites tools aren't available in this chat, say so instead of claiming Terminal alone can publish.

## Verification

The current task records its actual test/deployment results under ignored `.sites-runtime/release/verification.json`. A successful native publication verifies the combined **Terminal + Sites connector** path in this session. It does not prove a standalone Terminal API or that every ordinary ChatGPT conversation exposes Sites.
