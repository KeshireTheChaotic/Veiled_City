# R1 — complete

Offline application skeleton and generic-kernel acceptance completed2026-11-14, following R0 inventory/disposition completion800cf762. This is R1 acceptance, not full game, live Discord or production qualification.

| Required component | Implemented source |
|---|---|
| Offline boot and dependency-injected composition | index.js, rehearsal.js |
| Authenticated event/source envelope and principal/actor binding | source-authority.js, discord-intake.js, canonical-actor-readers.js |
| Audience resolver and accepted source packets | discord-audience-reader.js, context-authority.js |
| Source/receipt repository contract and native adapters | kernel.js, source-registry.js, turn-store.js |
| Versioned native registry | createRulesetRegistry in kernel.js |
| One scoped model gateway and exactly four AI capabilities | model-gateway.js, tool-contracts.js |
| No-send publication outbox | publication-queue.js |

Fresh phase acceptance verifies the CLI boots without credentials, live clients or effect handlers; the real rehearsal composes authentication, accepted context, native registry, gateway and outbox. A source-bound test operation registers through the native registry and produces a pending owner-choice receipt only. Unknown state patches, substituted sources, another owner's actor and stale revisions are rejected before preparation. Exact replay reuses the receipt/trace; inspection exposes no committed effects. Source/actor/audience revocation invalidates pending calls and drafts. GM-private canary bodies are not read or sent to inference. Model prose claiming99 damage neither invokes the native handler nor changes state; the no-send outbox withholds consequential prose for review.

Validation complete: **three fresh R1 checks pass**, included in the combined seven-check R0/R1 run109.2619ms, zero failures/skips. Native code, parser, registry, source/context/gateway/outbox and CLI are real; provider and world-reader data are synthetic. No live Discord, paid/cloud inference, Ollama call or campaign write occurred in phase acceptance. Original unchanged passing R1 suites were not rerun. Their existing reports remain historical supporting evidence. Static native closure remains136 modules,102 reachable,34 uncomposed,eight audited legacy utility/transport imports,zero missing import edges and exactly four AI capabilities; this does not prove every future ruleset/command is composed.

Files delivered: fresh r1-phase-acceptance.test.mjs, R1_PHASE_ACCEPTANCE.json, R1_PHASE_HASHES.json, this report and refreshed current phase/ledger/handoff descriptions. Existing runtime implementations satisfy this phase's skeleton gate; no unnecessary runtime rewrite or legacy deletion was introduced just to label completion.

Known holds belong to later gates: full entitlement/cognition/canon semantics(R2), all Daggerheart and house-rule mechanics(R3), robust conversational quality and automatic prose acceptance(R4), autonomous consequential world actions(R5), full command/private multiplayer/voice compatibility(R6), complete populated migration/durability/reconciliation/fault/performance qualification(R7), independent human acceptance and cutover(R8). Offline pending receipts and synthetic provider output do not prove those behaviors. Ordinary native rolls remain disabled and automatic narrative publication remains unqualified. qwen3.5:27b is approved for testing only.

Rollback: keep the legacy entrypoint and production configuration unchanged; leave the opt-in new runtime unused. Preserve existing native journals/snapshots and do not erase claims or downgrade schemas. This phase acceptance changes only tests/documentation, so no data rollback is required. Publish the phase commit to rebuild/veilkeeper2-audience-first only. Next exact phase: R2 source-backed NPC perception/correction and imported-knowledge lifecycle, retaining all R0 adoption/removal blockers until the relevant native contract is proved.
