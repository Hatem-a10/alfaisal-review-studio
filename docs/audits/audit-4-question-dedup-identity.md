# Audit 4 — question deduplication identity

| ID | Evidence | Remedy |
|---|---|---|
| QI-01 | Malformed question and option collections can throw during normalization or enter a pool | Validate usable row and collection shape |
| QI-02 | Decimal punctuation and comparison symbols are discarded in normalized identity | Preserve meaningful numeric punctuation and operators |
| QI-03 | Critical terms are sorted, allowing different ordered relationships to collapse | Keep ordered critical fingerprint |
| QI-04 | Bag-of-words matching can collapse reordered causal statements | Require bounded ordered token edits |
| QI-05 | Singular figure metadata is omitted from visual identity | Include singular figure image/source |
| QI-06 | Duplicate matching ignores the keyed answer and can silently discard conflicting key evidence | Include normalized keyed answer in matching and cache invalidation; retain conflicting entries for review |
| QI-07 | Non-string canonical metadata can create a spurious duplicate family | Require nonempty string canonical identifiers |

Five behavioral regression tests. No academic content or answer keys modified. The retained conflicting entries are not proof that either key is correct; source verification remains necessary.
