# Audit 4 — reading controls and mobile dock

| ID | Evidence | Remedy |
|---|---|---|
| RM-01 | Arbitrary numeric values are clamped but cannot be represented by the reading-setting selects; invalid coercions become valid values | Normalize to actual selectable presets |
| RM-02 | Any change event with a reading-setting key can write arbitrary preference fields | Limit writes to known keys within the settings panel |
| RM-03 | Responsive-image source lookup can match data-src instead of src | Match the actual attribute |
| RM-04 | Invalid variant paths/dimensions can create broken or unsafe responsive markup | Validate variant metadata and only include smaller variants |
| RM-05 | Existing decoding and self-closing tags can produce duplicate or invalid attributes | Replace existing responsive attributes and normalize closing syntax |
| RM-06 | Image with width but no height never receives the missing dimension | Fill each missing dimension independently |
| RM-07 | Failed responsive image leaves an irrelevant sizes attribute | Remove both responsive attributes on fallback |
| RM-08 | Dock ignores the site's explicit reduced-motion setting | Respect both device and site preferences |
| RM-09 | Hidden dock layout can clamp and erase the user's scroll position | Defer clamping while hidden |
| RM-10 | Multiple observer/resize notifications enqueue duplicate layout work | Coalesce animation frames |

Five behavioral/guard tests, no academic source or production changes.
