# Audit 4 — managed profile and privacy synchronization

| ID | Evidence | Remedy |
|---|---|---|
| MP-01 | Profile-change event during an active profile save is discarded | Queue and drain the latest profile after the active request |
| MP-02 | A failed profile save has no reconnect/focus retry unless another profile edit occurs | Retry on reconnect and focus using the acknowledged fingerprint |
| MP-03 | Changing the analytics checkbox submits a potentially stale or empty profile alongside the privacy preference | Send only the privacy preference and applicable analytics |
| MP-04 | Opting out still sends study counts unnecessarily | Omit analytics entirely on opt-out |
| MP-05 | Null or malformed study records and nonintegral or nonfinite totals can crash or distort count aggregation | Guard record shapes and bound safe integer counts |
| MP-06 | A forced status refresh during a pending request is silently coalesced into an older response | Queue another status fetch after the active request |
| MP-07 | An unsuccessful status fetch starts the full one-minute success cooldown | Only throttle after a valid response |
| MP-08 | A malformed flags payload can break control rendering | Validate flags before installing status |

Six behavioral tests, no academic-content or production changes. Hosted browser and multi-account verification remain outstanding.
