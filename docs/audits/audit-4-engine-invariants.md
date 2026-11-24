# Audit 4 — shared engine invariants

Baseline: `cd4ebb0022196bb15abeeecb0fd33324ac35f0d6` (staging after audit 3 preservation merge). These are distinct source-level findings, not claimed production incidents. Status: implementation candidate; test results and merged SHA must be recorded separately. No CVP academic content edits.

| ID | Severity | Evidence / finding | Candidate fix |
|---|---|---|---|
| A4-001 | High | ProgressDelta.apply accepts prohibited keys inside replacement objects and arrays | Reject unsafe nested keys before copying replacement values |
| A4-002 | Medium | ProgressDelta.apply traverses inherited properties rather than own object parents | Require own-property parents |
| A4-003 | Medium | ProgressDelta.apply accepts contradictory remove-plus-value operations | Reject contradictory and malformed patch operations |
| A4-004 | Medium | ProgressDelta.diff can generate paths deeper than apply accepts | Replace the bounded subtree at depth 16 |
| A4-005 | Medium | ProgressDelta.diff compares raw undefined fields although JSON transport removes them | Normalize diff inputs to wire JSON |
| A4-006 | High | AnswerIntegrity treats different runs with identical startedAt as one attempt | Compare attempt ID and set ID when available |
| A4-007 | High | AnswerIntegrity can restore a remote deletion at equal version | Respect existing remote tombstone |
| A4-008 | High | ExamEngine.pool falls through to every course for REN | Use explicit REN scope |
| A4-009 | Medium | ExamEngine.usable accepts empty stem and question identity | Require nonblank stem and ID |
| A4-010 | Medium | ExamEngine.usable accepts nonstring option explanations | Validate explanation types |
| A4-011 | High | ExamEngine.recordChange can write an out-of-range answer or invalid question index | Reject invalid question/choice positions |
| A4-012 | High | ExamEngine.recordChange can mutate a submitted exam | Guard finished attempts |
| A4-013 | Medium | ExamEngine.addActiveTime can accumulate nonexistent question index | Validate question position |
| A4-014 | High | Unmapped renal printed-key original questions are assigned to MOL in wrong-bank conversion | Recognize renal IDs and source |
| A4-015 | Medium | Repeated source question IDs are scored repeatedly by original wrong-bank conversion | Deduplicate by preserved original question identity |
| A4-016 | Medium | Daily candidate engine can emit tasks with undefined dates for unscheduled lectures | Exclude missing/invalid schedule dates |
| A4-017 | Medium | Readiness score divides by zero when course has no loaded lectures | Return finite zero with zero lecture count |
| A4-018 | Medium | Classic daily engine defaults explicit zero budget to 180 despite autopilot fix | Respect zero budget in shared planner |
| A4-019 | Medium | OSPE count of one or two yields zero stations | Use requested number for small circuits |
| A4-020 | Low | Finished OSPE position still reports a full station timer | Return zero remaining once finished |
| A4-021 | High | Missing station definitions can yield complete self-assessment | Require all station definitions and a positive denominator |
| A4-022 | Medium | Lecture-to-Anki matcher has no REN 123 course code support | Register REN course and number matching |
| A4-023 | Medium | Lecture-to-Anki matcher includes duplicate IDs and repeats text normalization per lecture | Deduplicate eligible cards and normalize once per deck |
| A4-024 | Medium | Lecture-to-Anki matcher accepts course strings as substrings of unrelated words | Use a course token boundary |

Regression file: `tests/cloudflare-staging-audit4-engine-invariants.test.mjs`. Existing full tests remain mandatory. Do not count fixes in the earlier audits as new; do not inflate counts using individual test inputs.
