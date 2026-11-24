# Audit 4 — profile setup and account-copy safety

| ID | Evidence | Remedy |
|---|---|---|
| PS-01 | Group configuration mutates live defaults before all response rows are validated | Validate complete configuration before publication |
| PS-02 | Concurrent group lookup can install stale responses | Share the in-flight request |
| PS-03 | Settings UI reintroduces owner group defaults after explicit clearing | Respect configured group/lab preference |
| PS-04 | Async group lookup clears a custom saved lab choice even when class/section are unchanged | Retain same-scope saved selection |
| PS-05 | Wizard accepts a student number consisting only of hash characters | Validate normalized identifier before completion |
| PS-06 | Canceling reset wizard persists preview appearance changes | Restore prior appearance on cancel |
| PS-07 | Managed account switch can fall back to unisolated raw storage when durable device storage is unavailable | Fail closed for managed accounts |
| PS-08 | Legacy target recovery copy is not validated for shape or matching account before raw storage mutation | Validate before modifying active state |
| PS-09 | Legacy copy switch has no rollback if writing destination fails | Retain verified recovery copy and restore previous values when possible |
| PS-10 | Fresh profile can be considered configured from a legacy-shaped cloud snapshot | Require nonlegacy profile and valid setup timestamp |
| PS-11 | Unconfigured managed profile can display a retained legacy photo | Hide until managed profile is configured |
| PS-12 | Explicit empty managed assignment fields fall back to unrelated local selections | Use nullish fallback |
| PS-13 | Failed profile-module import remains cached and blocks later attempts | Clear rejected promise for retry |
| PS-14 | Delayed signed-out UI import can show sign-in notice after authentication | Recheck authentication before showing notice |

Seven behavioral/guard tests; no user data migration or production changes.
