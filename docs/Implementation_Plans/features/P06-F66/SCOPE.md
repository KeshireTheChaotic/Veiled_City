# P06-F66 — Clause-Eater Conflicting Duty

Status: IMPLEMENTED EXACT SOURCE-BOUND CUE; MECHANICAL RESOLUTION HELD. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`.

Exact occurrence: `adversary:clause-eater:conflicting-duty`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#clause-eater/features/1`; occurrence/source hash `3be0f926c2e75572d68368365c225ea1274c28f6668ed07f2a8c25ef0211c4ed`; template hash `c2923812a24566e4ca25120a7dd760ff9af2b409a47346cfc8ea6eca1ae59297`.

Expose the exact authored Action cue only within the existing current, GM-owned Clause-Eater context. The adapter grants no Fear transaction, target/trigger proof, PC Presence Reaction Roll, player consequence selection, Vulnerable lifecycle, or effect receipt. The PC alone chooses among source-defined failure consequences; native code must resolve mechanics before any result is narrated as committed. No new limit on narrative output, GM creativity, NPC/faction autonomy or invention.

Changed modules: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, new `bot/src/native-adversary-conflicting-duty.js`, `bot/src/native-adversary-context.js`, fresh F66 and F01 tests, fresh coverage map, P06/F01/F66 and occurrence ledgers, and targeted evidence.

Rollback only this occurrence's descriptor, handler registration, projector and context dispatch; preserve existing state, private-audience checks, historical readers and outbox guarantees. Cost/cache: zero provider calls, tokens and spend; no cache savings claimed; Codex usage unavailable. Release authorization remains false.
