# Audit 4 — managed login landing

Reported symptom: Safari sign-in returns to https://alfaisal.review/%23dashboard and receives a 404. The staging Clerk mount configured a forced redirect of /#dashboard. Browser/SDK encoding of the fragment as a pathname is consistent with the report; no authenticated Safari reproduction has yet been performed.

| ID | Evidence | Remedy |
|---|---|---|
| ML-01 | Both managed login and registration use a fragment-bearing forced redirect | Give Clerk the absolute same-origin root; the app already defaults to Dashboard |
| ML-02 | The historical encoded dashboard pathname falls through server routing instead of recovering | Exact GET/HEAD alias redirects to root, preserves handshake query, prevents caching, accepts no external redirect destination |

Tests: tests/cloudflare-staging-audit4-managed-login-landing.test.mjs. The root still goes through normal authentication and account isolation. No production release or identity provider configuration change is performed. Verify the approved release in Safari, including both a new sign-in and the historical URL.
