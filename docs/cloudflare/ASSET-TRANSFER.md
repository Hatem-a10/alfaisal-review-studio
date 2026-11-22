# Production academic asset transfer

The source checksum pass included the existing curriculum payloads, study archives, and six approved private PDFs. The verifier matches all bytes to the tracked SHA-256 manifests and produces a list of exact R2 keys. It does not read personal upload namespaces or contact a provider.

| Academic source | References | Distinct R2 keys | Bytes |
| --- | ---: | ---: | ---: |
| Site curriculum | 660 | 655 | 254,629,181 |
| Study assets | 910 | 910 | 205,124,218 |
| Private publisher PDFs | 6 | 6 | 3,857,170 |
| Total | 1,576 | 1,571 | 463,610,569 |

The six PDFs are the Vlad & Olena question collection and 19th Batch TBLs 1–5. Existing study accounts, private Anki decks, progress blobs and personal file objects are outside the input set. Generated public client packs are built from the approved source commit.

## Source verification and private transfer directory

From the repository root, using the existing ignored staging asset work:

```sh
python3 scripts/verify-production-assets.py \
  --inventory .sites-runtime/staging/production-verified-inventory.json
```

For a future authorized transfer, pass `--prepare-root` with a new directory under `.sites-runtime` to materialize the exact keys while verifying bytes. The directory must not already exist. Use a fresh directory on any retry after a checksum failure. Keep the tree and receipt out of Git, email and public storage.

## Destination verification after authorization

1. Confirm the bucket is the designated private `review-studio-production` bucket. Disable its public development URL and custom public routes. Use credentials scoped to that bucket.
2. Upload the prepared keys using a per-object SHA-256 check and declared content type. Reuse an existing verified key. An existing key with different bytes is a stop condition. Write curriculum verification receipts only after verifying each data object, using the existing import receipt format. Do not transfer any arbitrary R2 prefix or staging catalog export.
3. Read the 1,571 uploaded payload objects back into a new local tree named by the exact keys. Keep auxiliary curriculum receipts outside that payload tree. Run `python3 scripts/verify-production-assets.py --readback-root <downloaded-payload-tree>`. It rejects missing, extra or mismatched payload objects. Verify the expected private routes independently with approved and unauthorized subjects.
4. Record bucket identity, manifest commit, counts, sizes, mismatches and representative end-to-end downloads. The source verification supports this transfer. The destination is pending provisioning and readback.

Use the asset run independently from routine application releases and database schema changes.
