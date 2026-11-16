# Imported test baseline

The full existing test suite on the v1.65 source reported 346 checks: 331 passed and 15 failed. These failures existed before the GitHub export and have not been suppressed or fixed by changing application behavior.

Failing groups:

- Three client-bundle/startup dependency-position assertions in client optimization tests.
- Five Accurate-mode range/source/mandatory-family expectations (older tests retain restrictions changed by later user requests).
- One original-catalog booklet visibility expectation (older catalog behavior).
- Six startup/sync harness assertions, including missing `window` in the isolated repair-sync harness.

Both baseline and sanitized-copy build/test results are reported at import completion. These test files remain in the repository so the known failures can be addressed separately. No CI or deployment automation was added to mask failures or publish changes.

Sanitized-copy verification: the same 346 tests ran, with 331 passed / 15 pre-existing failures. A privacy-redacted profile assertion now checks a generic nine-digit number instead of embedding the owner's ID. The sanitized production build passed. The application remains labeled v1.65; no new Site release was made.
