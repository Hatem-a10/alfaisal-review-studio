# Audit 4 — answer controls and figure zoom

Baseline: staging `93a3223d1bf8da0db32d497a2d367526bdb199d8`. These findings are separate from the existing engine and exam-lifecycle ledgers. They concern rendering, elimination controls and figure zoom, not question content or grading keys. No live account data was inspected. Status: implemented candidate; verify CI and hosted behavior separately.

| ID | Severity | Evidence | Change |
|---|---|---|---|
| CH-01 | High | choice-ui.js decoration creates data-clear-eliminated and render wrapper deletes restored answers | Rendering is read-only with respect to saved answers; checked inputs take precedence |
| CH-02 | High | checked locked review input is stripped of checked state when an elimination mark exists | Preserve checked feedback |
| CH-03 | Medium | elimination button remains enabled for locked questions | Disable control and reject handler |
| CH-04 | High | mock elimination deletes selected answer without deadline validation | Check deadline before clearing, finish expired run |
| CH-05 | Medium | original-run elimination bypasses finite deadline | Check run expiry before removal |
| CH-06 | High | inline elimination removes session answer without saving its draft | Persist immediately |
| CH-07 | Medium | concept elimination removes answer without immediate draft save | Persist practice draft |
| CH-08 | Medium | imported question hash only incorporates stem when nonempty | Incorporate option set |
| CH-09 | Medium | repeated identical option text uses one strike key | Distinguish duplicate choices by index |
| CH-10 | Medium | stored strike entry may be non-array and throw on includes | Validate array and filter string entries |
| CH-11 | Medium | inherited property lookup may return non-array prototype members | Own-key lookup and define own property |
| CH-12 | Medium | localStorage failure is swallowed in elimination handler | Warn without claiming successful save |
| CH-13 | Medium | checked and disabled regex scans all label text | Inspect radio markup only |
| CH-14 | Medium | concept answer counter depends on rendered radio count | Use actual answer map |
| CH-15 | Medium | image zoom only available via mouse/touch click | Keyboard focus, semantic label and Enter/Space activation |
| CH-16 | Medium | callbacks remain attached after zoom closes | Clear callbacks and invalidate generation |
| CH-17 | Low | fitted image does not resize with viewport | Refit only while fit mode is active |
| CH-18 | Low | zoom action before image loads computes a 1-pixel width | Ignore until natural width available |
| CH-19 | Low | src attribute can override browser-selected responsive image | Prefer currentSrc after explicit full-size source |
| CH-20 | Low | previous width persists during next image load | Reset sizing and scale |

Regression: `tests/cloudflare-staging-audit4-choice-controls.test.mjs`. The figure descriptions remain derived from existing source alt text, without introducing answer clues or unverified medical information. Hosted keyboard, touch and image-loading checks are outstanding. The imported question hash change may reset old cosmetic elimination marks for anonymous questions; saved answers are preserved.
