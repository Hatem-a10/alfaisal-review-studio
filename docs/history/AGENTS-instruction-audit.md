# Repository instruction audit

The [previous AGENTS.md](AGENTS-native-sites.md) records valuable academic safeguards and publication history. Its hosting directives applied to the former native ChatGPT Site.

| Previous guidance | Resolution in the current instructions |
| --- | --- |
| Use native ChatGPT Sites to publish the production build. | The live domain now uses the reviewed GitHub-to-Cloudflare release flow. The separate legacy Site retains its own deployment instructions. |
| Use historical site versions, launch checkpoints and owner-device assumptions. | Verify the actual Worker version and source SHA. On independent hosting require server-verified Clerk identity and the current role. |
| Fold previous source and category rules into a long set of release notes. | Keep provenance, stable IDs, corrected keys, category distribution and the Accurate CVP image target. Use the latest approved generator behavior and its tests to resolve historical differences. |
| Mix editorial standards, test procedures and operational rules in one document. | AGENTS is the entry point. Dedicated standards and current Cloudflare runbooks supply details. Historical documents are secondary. |

The repository instructions now explicitly require agents to read AGENTS.md before editing and define how to resolve conflicting documents.
