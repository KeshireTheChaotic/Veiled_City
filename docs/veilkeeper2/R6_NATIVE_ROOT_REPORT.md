# R6 — native composition root (complete slice)

Delivered: bot/src/v2/native-root.js createNativeRoot({client,directory,characterRepository,campaignRepository,rng,clock,handleOtherCommand,handleOtherComponent,onError}). It opens the six dedicated SQLite stores (scenes, sources, actions, prompts, decisions, interactions) in a caller-supplied new directory, builds canonical actor readers, source authority, the campaign GM policy reader, the owner-session reader and identity reader, the PC bootstrap source, and the exclusive interaction router (death, attendance, GM session/bootstrap/registration). close() is idempotent and closes the router before the stores. scene-store gained ownerPrivateChannel(campaign,sceneId,ownerUserId), which returns a channel only when exactly one verified private channel exists; the root's owner route is built from it and refuses unverified or absent channels.

Tests: r6-native-root.test.mjs 2 passed (store files, exclusive client ownership and release, owner route refusals and success); r1-scene-store 6 passed (additive reader).

Known issues: not wired to the real legacy database or a started Discord client; simulated client only; rng and handleOther* callbacks must be supplied by the host; the six stores are new databases, never production. Startup, shutdown ordering under live traffic, migration of historical state and the human-GM session assembly flow remain open.

Deferred: host entry point that selects native vs legacy startup; historical migration; session recap/opening; remaining rules adapters.
