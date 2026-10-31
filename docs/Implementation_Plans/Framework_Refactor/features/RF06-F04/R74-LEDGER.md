# RF06-F04 R74 — Private PvP review attachment boundary

Base: `ffd231a4abfb0c0d8e6247d3148f56ecc41164ac` (`AF04 reuse native PC condition and recovery contracts`). The reviewed base contained no R74 source changes. Agent A granted exclusive ownership of `bot/src/pvp-menu.js`; Agent C confirmed no source overlap.

The private PvP menu now uses `createAttachment` from the existing Discord public API. The diff removes only `AttachmentBuilder` from the direct `discord.js` import, adds `createAttachment` to the existing Discord public import, and replaces the constructor call with the helper. UI components, current owner/source/scene checks, offer terms, response content and recipient boundary are unchanged.

Fresh test: `node --test tests/ai-gm-2026-10/rf06-f04-r74.test.mjs` — exit 0, 1 passed, 0 failed, 0 skipped, 1,482.1158 ms. The fresh in-memory SQLite fixture creates two current owners, an authenticated authored PC conflict, and a genuine pending PvP proposal through native intent and agreement APIs, then calls the actual `openPvpMenu` path. It verifies an ephemeral payload with mention suppression and `private-pvp-review.txt`, and checks that the proposal stays proposed, both owners have no consent record, no round receipt appears, no review record is created for the opposing owner, and only one private UI token is added. The test does not press controls or exercise any consent/reaction/roll path.

Changed-source syntax: `node --check src/pvp-menu.js` and `node --check tests/ai-gm-2026-10/rf06-f04-r74.test.mjs` — both exit 0. The changed-path architecture inspection found no active violations or transition errors for `bot/src/pvp-menu.js`; the existing module-location and cross-framework transition records remain because this slice does not migrate those boundaries. No RF06-wide pass is claimed.

Fixture history: the first attempt lacked the established AI-intent compatibility initializer; the second assumed character location survives session assignment. The fixture now initializes runtime bindings and sets both test characters to the same existing location after assignment. These were fixture setup issues, not source defects. The final focused run and syntax checks passed.

Fresh test path SHA256: `f5f2a08319940f3c452b9a9bdcd2802f2c8d1605ef0b14274d65452f136eb312` (`bot/tests/ai-gm-2026-10/rf06-f04-r74.test.mjs`). The test remains ignored/local under the current RF convention and is not staged. Source base Git blob: `956be4368c7209011c7bf2ff3a8058df29500e2a`.

Result: `28415e87a70b7f3c7eab304b4f54c4fd86d20f1d` (`RF06 F04 R74 use Discord PvP menu attachment interface`).

No transition record was retired because `pvp-menu.js` retains Discord UI component builders and numerous other existing responsibilities. No schema/persisted reader change, transaction-sensitive repository, live Discord/provider call, production database, deployment, CI, push, or merge is involved. Rollback: revert only the R74 source and evidence paths. Next exact feature: RF06-F04 R75, inspect the next independent command/publication boundary after Agent A returns the shared index window; do not extend this private PvP attachment slice into transaction or consent behavior.
