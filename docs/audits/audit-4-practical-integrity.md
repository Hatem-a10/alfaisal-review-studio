# Audit 4 — practical study integrity

| ID | Evidence | Remedy |
|---|---|---|
| PI-01 | Practical merge assumes objects and iterable attempt collections | Guard stored collection shapes |
| PI-02 | Map merge guards only incoming keys; old prototype-like keys pass through | Filter both sides |
| PI-03 | Newest comparison loses a sole legacy row when its timestamp is absent | Preserve an existing sole row |
| PI-04 | Lab scoring can count invalid keys or mark an empty topic complete | Validate key and choice domains and nonempty topic |
| PI-05 | Visual mastery trusts truthy flags and malformed mastery timestamps | Require explicit visual evidence and valid earned timestamp |
| PI-06 | Attempt mastery accepts impossible or noninteger counts and inconsistent supplied answers | Reconcile counts against supplied choices; preserve count-only legacy records |
| PI-07 | Draft restore trusts stale topic identity, invalid option indices and obsolete IDs | Validate identity and canonical choices; retain valid answers |
| PI-08 | Repeated/stale submission can write the same run again | Guard active topic and submitted state |
| PI-09 | Fractional/invalid topic index can select a nonexistent topic | Require safe integer navigation |
| PI-10 | Stale notes control saves under whichever module is currently selected | Bind notes control to module ID |
| PI-11 | Stale course/category/module buttons can select a module outside the current course | Validate current scope and eligible controls |
| PI-12 | Numeric recall without an explanation tries to read matching pairs | Use type-appropriate fallback |
| PI-13 | A stale recall activity button dereferences an absent activity | Guard current activity identity |

Behavioral tests plus runtime guard assertions. No archived curriculum or production data edited; existing 500-attempt retention policy is unchanged.
