# Audit 4 — evidence ledger (500-finding target)

This is a rolling engineering audit, not a claim that 500 defects exist. Count distinct findings only; previous audit findings and their follow-up work remain separate. Source baseline: `ac3bff81b795d9689834a31e33d37109bc5e5f33`. No changes to academic content, live accounts, production, DNS, or existing student records. CI and hosted checks are separate. All statuses below are **candidate**, pending independent CI and staging verification.

## Batch 1 — asset boundaries and verification

| ID | Severity | Evidence (source baseline) | Candidate fix / verification |
|---|---|---|---|
| A4-001 | Medium | academic-config PUT buffers text before byte enforcement | bounded request decoder |
| A4-002 | Medium | admin-assets/report POST buffers text before checking limit | bounded request decoder; multibyte test |
| A4-003 | Medium | report null reaches property access | reject null; behavioral test |
| A4-004 | Medium | report fingerprint regex coerces array | require string; behavioral test |
| A4-005 | Medium | report write exception escapes route | controlled 503; behavioral test |
| A4-006 | Medium | private-media POST parses multipart before streamed cap | bounded form reader |
| A4-007 | Low | private-media accepts repeated asset field names | reject duplicates before write; behavioral test |
| A4-008 | Medium | private-media partial writes lack recoverable response | partial saved count and retry guidance |
| A4-009 | Medium | admin-assets/import buffers raw ZIP before limit | bounded request decoder |
| A4-010 | Low | admin-assets/import accepts repeated paths | reject duplicates before write |
| A4-011 | Medium | study-assets POST buffers raw archive before limit | bounded request decoder |
| A4-012 | Low | study-assets accepts repeated IDs | reject duplicates; behavioral test |
| A4-013 | Medium | study-assets GET counts wrong-size objects as verified | check manifest lengths; behavioral test |
| A4-014 | High | same-size study asset skips digest verification on migration | require verified checksum metadata or verified replacement; legacy fixture |
| A4-015 | Medium | parallel migration can reject before concurrent writes settle | wait for settled batch and count successes |
| A4-016 | Medium | study-assets inventory provider exception escapes | controlled 503 |
| A4-017 | High | study-assets GET can return truncated object with manifest Content-Length | reject length mismatch |
| A4-018 | Medium | upstream model fetch exception escapes route | controlled 503 |
| A4-019 | Medium | upstream model fetch has no deadline | abort after 15 seconds |
| A4-020 | Medium | upstream model read buffers before size validation | bound streamed bytes by manifest size |
| A4-021 | Medium | publisher-pack conditional response bypasses existence check | verify metadata first; behavioral test |
| A4-022 | Low | publisher HEAD opens body unnecessarily | use head; behavioral test |
| A4-023 | Medium | site asset full/ranged GET does not check actual object size | check object and metadata; behavioral test |
| A4-024 | Low | range parser accepts unsafe numeric suffix/end | enforce safe integers; behavioral test |
| A4-025 | Medium | If-Range mismatch still returns partial content | return full current representation; behavioral test |
| A4-026 | Low | site asset HEAD processes Range as if GET | return full representation metadata; behavioral test |
| A4-027 | Medium | site asset storage errors escape response | controlled 503; behavioral test |
| A4-028 | Low | private-media matching ETag opens object body | check metadata only |

## Verification

PR: pending creation. Added `tests/cloudflare-staging-audit4-asset-boundaries.test.mjs` and extended existing migration fixtures. Legacy study assets that were uploaded without digest metadata are now reported separately as size-matched but unverified; do not migrate existing production assets during this audit. Production is not authorized. Existing data and object keys remain unchanged.
