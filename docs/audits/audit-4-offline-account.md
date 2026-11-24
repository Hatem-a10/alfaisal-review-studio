# Audit 4 — offline account boundaries

Scope: staging candidate only; no live account data inspected, no deletion or production deployment performed.

| ID | Evidence | Remedy |
|---|---|---|
| OA-01 | The service worker verifies identity before requesting a private asset but cannot prove the response belongs to that same account | Stamp successful protected responses from authenticated request identity; require matching tag before returning/caching |
| OA-02 | Failed or changed identity preflight forwards the original request into a different account context | Fail closed with retryable response |
| OA-03 | Malformed successful identity JSON falls into the ordinary offline fallback | Deny fallback when identity response itself is invalid |
| OA-04 | Implicit HTTP caching of protected asset responses can reuse bytes across account changes | Use no-store HTTP response and request policy while retaining explicit per-account Cache API storage |
| OA-05 | Legacy user-specific mock figures lack proof of the account that supplied them | Refuse unverified figure fallback; preserve underlying old caches and legacy shared assets |
| OA-06 | Previously bound account remains active while a new account key is asynchronously verified | Immediately revoke earlier binding before checking a changed online identity |
| OA-07 | CLEAR_OFFLINE reports cleared:true without an account binding | Report actual success/failure |
| OA-08 | In-flight downloads/cache writes can repopulate a cache after clearing | Track account epochs, wait for active writes and guard late writes and fallback |
| OA-09 | Cache-size validation does not release the stream reader | Release reader in finally |

Tests: tests/cloudflare-staging-audit4-offline-account.test.mjs. Full CI and hosted cross-account/offline verification required. An older untagged user-specific figure requires an authenticated online download before it becomes available offline again. No data migration or automatic cleanup of existing untagged caches is performed.
