# Audit 4 — admin and account consistency

Scope: shared admin runtime and account persistence. These are additional findings or hardening cases, not a claim of live incidents. Verification is the regression tests in this PR plus the staging CI run; authenticated hosted smoke testing is separate.

| Ref | Finding | Correction |
| --- | --- | --- |
| AC-01 | Absent pagination parameters coerced to zero and clamped to one row | Preserve documented default |
| AC-02 | Equal report timestamps leave pagination order ambiguous | Stable identifier tie-break |
| AC-03 | Null or array report payload can reach object field handling | Require object |
| AC-04 | Control-character normalization can erase an otherwise nonempty proposal | Validate normalized proposal |
| AC-05 | Proposal accepts duplicate normalized choices | Reject duplicates |
| AC-06 | Proposal answer index may refer to an absent choice | Bound against actual options |
| AC-07 | Approver can commit a proposal replaced after their read | Compare exact proposal fields in update |
| AC-08 | Failed concurrent revision update may still insert a revision | Guard dependent insertion |
| AC-09 | Read-only student report endpoints accept unsupported methods | Enforce GET |
| AC-10 | Announcements for unrelated groups consume the audience result limit | Filter audience before LIMIT |
| AC-11 | Stored non-object profile values can break audience resolution | Safe object parsing |
| AC-12 | Non-string date values can enter report date validation | Require date string |
| AC-13 | Privacy-only write may replay stale profile fields over a newer update | Preserve current database profile |
| AC-14 | Missing account row can be dereferenced before authorization | Authenticate then handle absent row |
| AC-15 | Invalid stored profile can cause uncaught parsing failure | Return controlled response |
| AC-16 | Invalid profile payload shapes can overwrite profile state | Validate profile shape |
| AC-17 | Coerced nonnumeric/nonfinite analytics values can become counters | Require finite numbers |
| AC-18 | Request stream locks not consistently released on failure | Release locks in finally |
| AC-19 | Academic event clash checks repeatedly derive the same weekday inside the pairwise loop | Precompute weekday on a copy |

Tests: admin-content, managed-accounts, admin-academics. No production data or access-policy changes.
