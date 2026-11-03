# R3 — durable Fear opportunity reader (slice complete)

The native reader revalidates the original owner source and derives roll timing from saved ordinary-roll evidence. A caller-supplied empty roll reference cannot conceal dice already recorded. Campaign, scene, principal and actor must match the original request; the GM decision remains a separately inspected native dependency. No AI capability or execution path was added.

Modified files: `rules/roll-store.js` adds the native request-result reader; `rules/fear-opportunity-reader.js` binds it to source and actor inspection; the new focused test exercises real SQLite requests and reservations. This report and its hash manifest record the checkpoint.

Verification complete: from `bot`, `node --test tests/veilkeeper2/r3-fear-opportunity-reader.test.mjs tests/veilkeeper2/r3-roll-store.test.mjs tests/veilkeeper2/r3-roll-lifecycle.test.mjs tests/veilkeeper2/r3-roll-action.test.mjs`. Actual result: 10 passed, zero failures/skips, 69.4551 ms. The preceding invocation's output exceeded the context limit; this observable verification was captured locally in the parent workspace as `fear-opportunity-test.log`. Cases cover reservation before saved dice, rejection after dice, campaign mismatch and changed roll-store consumers. Source and GM decision readers are injected test dependencies; these tests do not establish live Discord quality.

Known holds: native GM decision provenance and lifecycle, simultaneous roll/announcement locking across stores, notice publication, Fear debit and validated attack settlement, migration and rollback qualification. The reader is opt-in; production has not changed. Rollback removes its installation without touching legacy state. No data migration or runtime retirement occurred.

R3 remains partial. Next exact phase: continue R3 by qualifying persisted reservation reconstruction and current native opportunity checks after reopening, before any Fear execution. Major-phase integration and publishing target `rebuild/veilkeeper2-audience-first`, never `codex/clean-ai-gm-2026-10`; no complete major-phase gate is claimed here.
