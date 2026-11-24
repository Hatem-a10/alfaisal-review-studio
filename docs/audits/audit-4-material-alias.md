# Audit 4 — personal original and cleanup integrity

| ID | Evidence | Remedy |
|---|---|---|
| MA-01 | Null or malformed stored alias can throw instead of returning missing original | Validate bounded alias shape and types |
| MA-02 | Alias permits arbitrary unregistered shared content hashes | Restrict shared target to registered hash/size pair |
| MA-03 | Legacy mutable same-account alias only checks byte length | Verify actual content checksum |
| MA-04 | Known original lookup trusts equal byte length rather than actual stored content | Verify stored digest before reporting built-in duplicate |
| MA-05 | Malformed cleanup request defaults to offset zero and can initiate storage mutation | Reject invalid bounded JSON request and strict offset |
| MA-06 | Out-of-range cleanup offset reports successful completion | Reject stale cursor beyond catalog |
| MA-07 | Cleanup reads and processes originals with inconsistent declared size | Check bounded matching source size before reading |
| MA-08 | Canonical key equal to original path can delete the canonical copy itself | Explicitly skip self-alias |
| MA-09 | Cleanup verification failure produces uncontrolled error after earlier operations | Return safe partial-progress response and preserve unverified original |
| MA-10 | Materials endpoint can serve ANKI rows through document route | Restrict to actual material rows |
| MA-11 | Legacy invalid filename or untrusted MIME can break or misrepresent downloads | Normalize filename encoding and restrict MIME |
| MA-12 | Material errors omit private no-store policy | Apply noncacheable policy to errors |

Five added synthetic regression tests. No real cleanup, live storage operation, academic source modification or production deployment performed.
