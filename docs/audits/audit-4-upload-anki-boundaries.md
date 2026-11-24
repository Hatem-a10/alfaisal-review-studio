# Audit 4 — upload and deck boundary follow-up

This batch builds on merged PRs #59–#62. It deliberately excludes the earlier audit's original personal ZIP-validation, reported-card-count, incomplete cloud upload, figure-omission, duplicate-attachment and capacity-accounting findings from the **new** count. It does not claim server-side SQLite card counts or permission to delete orphaned cloud objects.

| ID | New source-level finding | Candidate remedy |
|---|---|---|
| A4-102 | Shared Anki upload accepted a header-only file with no collection directory | Structural ZIP central-directory and local-header validation |
| A4-103 | Anki card/note row counts were enforced only after SQL rows had been materialized | Count before allocating the large row collections |
| A4-104 | Multiple media entries with the same name silently overwrote one another | Keep the first, report duplicates |
| A4-105 | Image-only conditional fields rendered as empty | Include image/audio/video/SVG content in nonempty check |
| A4-106 | Template lookup could read inherited object properties instead of actual fields | Null-prototype own-key fields |
| A4-107 | Overlapping Anki library refreshes could apply stale deck lists | Generation and account guard |
| A4-108 | Failed or blocked main Anki IndexedDB open remained cached indefinitely | Reset rejected open, handle blocked/version-change |
| A4-109 | Remote deck download captured account only after asynchronous network transfer | Capture initiating account before download |
| A4-110 | Rating guard did not detect a different card at same index | Verify captured card and answer-reveal state |
| A4-111 | Anki schedule imports accepted negative intervals, fractional/negative repetitions, invalid date, or array-shaped cards | Reject malformed records |
| A4-112 | PDF extraction exceptions skipped document cleanup | Always destroy PDF in finally |
| A4-113 | PDF extraction recalculated cumulative text size on every page | Maintain running character total |
| A4-114 | PDF page-count cap was only checked after client extracted all pages | Reject too many pages before iteration |
| A4-115 | Office ZIP import lacked aggregate archive expansion and entry caps | Bound expansion before extracting XML |
| A4-116 | PPTX slide numbers derived from file names, not actual presentation order | Resolve ordered presentation relationships |
| A4-117 | One failed image decode stopped entire Office upload | Isolate failed image and preserve original with omission report |
| A4-118 | Office extraction text limits were enforced only after all pages were collected | Check each page and aggregate incrementally |
| A4-119 | A stale cloud deck action could dereference missing metadata | Guard missing deck before download |
| A4-120 | Saved Anki background dimming values could exceed the supported range | Clamp to the UI's 0–80 range |

## Prior audit follow-up (not new count)

- #15: client now counts omitted figures, including skipped batch images; server adds its own filtering count, and review status displays it.
- #16: explicit personal upload requests the existing built-in original alias with the selected lecture; original bytes remain canonical.
- #18: unfinished cloud deck reservations return a recoverable 503 with original-file retry guidance. Reservation retention is intentional for idempotent retry; no destructive cleanup.
- #19: cloud metadata is explicitly labeled as reported, verified by the browser on import. Server-side counting of compressed SQLite rows remains unimplemented; the server verifies the archive shape, not card contents.
- #20: personal and shared upload verify bounded central directory and recognized collection entry instead of only ZIP magic. Browser still validates actual collection contents.
- #46: aggregate study capacity combines separate lectures' measured/estimated activity, using max per lecture to avoid double-counting overlap. Exact session-to-review linkage is not available.

Verification: tests/cloudflare-staging-audit4-upload-anki.test.mjs plus revised shared package test and existing real Anki package fixtures. All new rows remain candidate until CI passes. No production deploy or academic content change.
