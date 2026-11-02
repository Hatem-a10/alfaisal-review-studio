# Review Studio project instructions

This checkout belongs to the existing owner-private Site `appgprj_6ade126fa77081919dc24e7a87700a9f`, URL https://alfaisal-review-studio.barcman2000.chatgpt.site/ . Never create a replacement Site to publish updates. Preserve `.openai/hosting.json`, DB/BUCKET bindings, user data, access settings and runtime secrets.

Source: `public/`, `app/`, `lib/`; generated `dist/` is not the editing source. Keep large lecture originals/media in existing private storage. Preserve stable question/topic IDs, saved answers, earned mastery and independent review passes.

For publishing requests, read `docs/DEPLOYMENT.md` and the currently installed official Sites skill. Use Chat On Steroids for local files/Terminal and native Sites for authentication and save/deploy. `./scripts/review-studio-release check` runs tests/build without publishing. `open`/`prepare` accept native credential JSON on hidden stdin and use the official helper; never put credentials in shell commands, files, logs or persistent Git configuration. Review all existing changes first: the official helper stages the full nonignored checkout. Preserve unrelated user edits.

No documented standalone Sites publishing API or permanent Terminal login is configured. Do not invent curl endpoints, extract browser cookies/session credentials, expose bypass tokens, or claim Git push means deployment. Native successful deployment status at the existing URL is required before saying live. If the current ordinary ChatGPT conversation lacks native Sites tools, complete safe local work and state that exact limitation. Never silently change audience, create infrastructure or deploy directly through Cloudflare as a substitute.
