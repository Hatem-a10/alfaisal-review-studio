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

PR #61: full CI passed and merged into staging at 6502963904989c353850edd5abc3fff5d16867f7. Hosted signed-in checks remain outstanding. Added `tests/cloudflare-staging-audit4-asset-boundaries.test.mjs` and extended existing migration fixtures. Legacy study assets that were uploaded without digest metadata are now reported separately as size-matched but unverified; do not migrate existing production assets during this audit. Production is not authorized. Existing data and object keys remain unchanged.

## Batch 2 — exam lifecycle and answer integrity

Baseline: `6502963904989c353850edd5abc3fff5d16867f7`. Candidate changes; tests and full CI required. No printed keys, questions, CVP content, or score thresholds altered.

| ID | Severity | Evidence (source baseline) | Candidate fix / verification |
|---|---|---|---|
| EX-029 | High | classic mock start handler awaits faculty loading before locking | serialize starts; asynchronous behavioral test |
| EX-030 | High | async mock start uses controls/global selections after awaits | capture and verify settings; behavioral test |
| EX-031 | High | direct classic launch can overwrite active exam | enforce active-exam guard; behavioral test |
| EX-032 | High | cancellation clears current exam but saved family stays In progress | persist cancellation with no answers/score; cancellation test |
| EX-033 | High | finished mock replacement ignores failed full-snapshot save | require successful save before replacement; retry and export |
| EX-034 | Medium | retry API can create count then replace with larger whole question list | require exact original snapshot length |
| EX-035 | High | saved answer maps admit out-of-range and non-index choices | validate restored keys/values; behavioral test |
| EX-036 | Medium | saved flags may be absent or have invalid indexes | rebuild valid flag map; behavioral test |
| EX-037 | High | vault hydration accepts empty or over-limit question arrays | reuse startup restore validation; behavioral test |
| EX-038 | Medium | saved history uses number of answer map keys as denominator | count valid choices only |
| EX-044 | Medium | random booklet fallback repeatedly scans full array and may interleave new IDs | precomputed fallback ranks |
| EX-045 | Low | advancing a pinned item when filtered list is empty yields position -1 | clamp to nonnegative position; behavioral test |
| EX-046 | High | Examplify hotkeys stay active when navigating away to unrelated screens | scope active interactions to current exam view |
| EX-047 | Medium | calculator key handler intercepts modal and modified shortcuts | respect dialogs, modifiers, prevented events |
| EX-048 | Medium | written original Examplify answers can change after deadline but before next tick | check absolute deadline before writing |
| EX-049 | Medium | deferred pointer highlight can apply to newly selected question | bind callback to exact run and question |
| EX-050 | Medium | keyboard numeric shortcuts stop at five although up to eight choices supported | support 1–8 and update instructions; F remains flag |
| EX-053 | High | deferred original adapter can cache incomplete questions; partial UI can submit or expire before all questions load | revalidate complete bank, preserve answers and offer reload |
| EX-054 | High | default mock selection passes empty array to pool, excluding ordinary course questions | unrestricted course pool when mix disabled; behavioral test |
| EX-055 | High | custom lesson mix adds unfiltered original questions from other lectures | filter original pool by selected lecture IDs; behavioral test |
| EX-056 | High | delayed sync reconciliation attributes mock attempts to current day rather than recorded answer date | use first-answer time or saved submission time |
| EX-057 | Medium | ASCII-only normalization conflates distinct Greek-letter medical stems | Unicode-aware normalization; behavioral test |
| EX-058 | High | identical image question wording can suppress different source figures | preserve distinct visual contexts; behavioral test |
| EX-059 | High | stem dedup ignores differing options | preserve different option sets except explicit canonical families; behavioral test |
| EX-060 | Low | mock summary accepts fractional correct and total counters | require safe integers during startup and hydration |
| EX-061 | High | originalLowScore can delete finished original runs before deferred data is loaded | require full bank before threshold checks; behavioral test |
| EX-062 | Medium | original grade treats out-of-range printed key as usable | validate key range; behavioral test |
| EX-063 | Medium | original grade counts invalid stored answer as answered | validate choice range; behavioral test |

Tests: `tests/cloudflare-staging-audit4-exam-lifecycle.test.mjs` plus updated shortcut expectations. Previous batch #61 passed full CI and merged; authenticated Worker verification remains separate.


Integration note: EX identifiers distinguish this batch from independently authored A4 ledgers. Seven overlapping rows (original 039–043 and 051–052) are excluded from this batch's distinct count because #62 / core matrix already cover them. Their tests remain useful cross-checks. The additional legacy history-limit sort correction is included in the chronology changes without claiming an extra row. Candidate is based on 8b9a2ec835a98613d7ad41bb066607665b708c9a.
