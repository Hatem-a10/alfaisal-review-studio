# Audit 4 — Anki context links

| ID | Evidence | Remedy |
|---|---|---|
| XL-01 | Null/non-array lecture, deck, card collections and non-string lecture IDs can break matching | Guard collections and identities |
| XL-02 | Duplicate deck or lecture rows duplicate link results | Deduplicate deck/lecture output |
| XL-03 | Explicit crosslink regex accepts the wrong course number, e.g. MOL 123 | Use course-specific number |
| XL-04 | Concatenating unrelated deck labels/tags can create a false explicit lecture code across field boundaries | Match individual normalized fields |
| XL-05 | Title fallback can link a card explicitly scoped to a different course | Reject conflicting course scope |
| XL-06 | Substring title matching accepts titles inside larger words | Require normalized word boundaries |
| XL-07 | Cached links depend on deck identity alone; changes in the curriculum leave stale links | Track curriculum IDs and titles and clear links when decks disappear |
| XL-08 | Context actions can link inaccessible lectures and stale click targets | Enforce current visibility at render and click |
| XL-09 | Context action navigates away before the Anki API is ready | Check readiness before navigation |

Five behavioral tests and existing phase3-links regression coverage. No archived academic content, production release, or live data changes.
