# Audit 4 — Safari login landing

| ID | Evidence | Remedy |
|---|---|---|
| SL-01 | Clerk forceRedirectUrl contains /#dashboard; user reported /%23dashboard returning 404, and Worker has no recovery for that path | Redirect sign-in and sign-up to /; recover only the exact legacy encoded dashboard path via same-origin redirect; root still passes normal authentication and production gates |

Behavioral tests exercise both Clerk mount modes and exact recovery with GET/HEAD, query preservation, unrelated paths and POST rejection. The two defensive changes address one finding, not two. Hosted Safari sign-in remains unverified until an approved production release and real browser test.
