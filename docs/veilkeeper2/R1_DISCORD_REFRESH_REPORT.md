# R1 — refreshed Discord audience reader

Completed reader slice; full R1/R2 remain open. `discord-audience-reader.js` refreshes the guild, channel, full member collection and roles before invoking the existing native permission projection. It uses the fetched collections, supports cancellation and never substitutes a cached proof after refresh failure. It performs no writes or sends.

Fresh test command: `node --test tests/veilkeeper2/r1-discord-audience-reader.test.mjs`, run from bot. Actual outcome: 3/3 passed, zero failures/skips, 5484.5365 ms. Tests cover fetch arguments and returned membership, outsiders/incomplete snapshots, cancellation and failed refresh. SDK permission bitfields are real; transport is injected. No live Discord request was made. The unchanged permission suite was not rerun.

Remaining: live SDK/intent qualification, snapshot freshness across separate fetches, permission changes during inference, authenticated message ingestion, scene-store commit linkage, thread/DM surfaces and send-time revalidation. No production change, migration, deployment or push occurred. Rollback is to leave the opt-in adapter unused. R3–R8 remain outstanding. Next: connect authenticated ingestion and retained permission proofs to draft invalidation.
