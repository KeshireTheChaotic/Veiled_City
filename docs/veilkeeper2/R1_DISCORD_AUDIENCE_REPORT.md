# R1/R2 — Discord audience permission projection

Completed guild-text permission reader slice; live ingestion and full channel compatibility remain open.

`discord-audience.js` uses installed Discord permission flags and effective member permissions to derive recipients/writers, explicitly separate privileged operational observers, and fingerprint the result. The pinned legacy privacy policy permits Administrator, ManageGuild and configured GM-role observers; the new reader preserves that distinction without treating their observation as PC knowledge. A GM participating as a player remains a recipient. Other ordinary members/bots who can read are included and therefore prevent owner-only private qualification. Missing members, unresolved permissions, absent private owner, unavailable configured GM role or inadequate bot access fail closed.

Only GuildText is qualified in this slice. Threads, DMs and other surfaces are refused pending their own native membership/permission treatment, not declared unsupported for the final rebuild. Caller must refresh guild/channel/full membership before inspection. Matching member counts alone is not proof of freshness. Nothing here fetches Discord state, sends messages or changes permissions. The result is a native candidate snapshot, not lasting publication authority.

Official [Discord permissions documentation](https://docs.discord.com/developers/topics/permissions) and the installed SDK were checked for effective member permission handling, administrator behavior and separate thread permissions. Legacy `frameworks/discord/privacy.js` was inspected; no old code was changed.

Five newly authored tests: **5/5 passed**, zero failures/skips, 5801.8552 ms. They cover privileged observer separation, outsider/bot access, party readers versus writers, participating GMs, incomplete membership, unknown permissions, missing owner, thread refusal, required bot access and proof changes. Tests use real SDK permission bitfields with synthetic guild/member/channel objects; they are not live Discord proof. Output/metadata: R1_DISCORD_AUDIENCE_TEST_*. Exact hashes: R1_DISCORD_AUDIENCE_HASHES.json. No unchanged suites were rerun.

Production, legacy source/schema/content and remote branches remain unchanged. Rollback is to leave the opt-in reader unused. Live authenticated ingestion, post-inference/send-time refresh, all channel types, durable observer evidence, full migration and R3–R8 remain open. No major phase completed; no phase push was made. The unrelated README edit remains untouched.

**Next exact work:** connect refreshed native Discord evidence to scene-store snapshots without trusting input flags; carry observer fingerprints into invalidation, qualify threads/private surfaces, and finish recall/context adapters before R3 native rules.
