# Audit 4 — deferred reading and index integrity

Scope: shared reading/search runtime and generated index. No changes to academic text, questions, dates or original documents.

| ID | Evidence | Remedy |
|---|---|---|
| SI-01 | URL-keyed pending request drops later consumers when sources share the same content hash | Fan out one response to each distinct consumer |
| SI-02 | Reading payload allows duplicate and invalid page numbers, silently keeping last duplicate | Validate positive unique page identities |
| SI-03 | Missing reading pages still set readingLoaded true | Require text or matching payload for each expected page before mutation |
| SI-04 | Index page metadata accepted without validating source, page or snippet | Validate page records |
| SI-05 | Index term posting arrays and offsets are unchecked | Validate term shape and in-range integer indices |
| SI-06 | Index and term cache survive a changed content-addressed URL | Invalidate both caches and reject stale response installation |
| SI-07 | Unicode-normalized local matches use unnormalized string offsets; empty positions produce blank previews | Reuse normalized text for offsets and bound preview start |
| SI-08 | No-matches fallback is unreachable because the prefixed HTML string is always truthy | Explicit no-results feedback |

Separate prior-audit follow-up (not counted as a new finding): the generator still discarded single-letter terms even though the client supports exact single-letter postings. Retain them during generation and test the compressed output.

Tests: tests/cloudflare-staging-audit4-source-index.test.mjs. CI and hosted checks required.
