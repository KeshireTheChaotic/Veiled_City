# P06-F65 — Clause-Eater Loophole

Status: SUPPORTED SOURCE-BOUND CUE; trigger and effects held. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; implementation commit `9cb535592df4663f5c08a3d3143319cb64ac2eec`.

Exact occurrence: `adversary:clause-eater:loophole`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#clause-eater/features/0`; source file SHA-256 `846386ded200f84e487f69c1b82adf4387dcb41526cb60e8ee777e48727fca9c`; occurrence hash `2759fc3b9542ea6cbc4c1efbb98b980401f6a7b22cbf7c7f510e9715e911af30`; template SHA-256 `c2923812a24566e4ca25120a7dd760ff9af2b409a47346cfc8ea6eca1ae59297`.

Expose the authored Reaction cue in current GM-owned Clause-Eater context. The cue does not decide whether the invocation trigger occurred, what the PC clarifies, whether the PC has an exception, or mark Stress. Those remain native/source-governed resolution and player-owned decisions. No new restriction on narrative output, NPC autonomy or invention is introduced.

Changed modules: exact feature descriptor/catalog, Clause-Eater cue projector/adversary context, fresh F65 test, F01 count test and shared coverage map. Corrected frozen run `p06-f65-20261022-b` passed 236/236 across 62 explicitly mapped fresh files; changed syntax 5/5 and JSON parse 2/2 passed before the failed launcher attempt, with no associated source edits afterward. No legacy tests are included in the qualifying batch.

Local holds: event qualification, obligation classification, player clarification, NPC Stress mutation, persistence and replay. Roll back only this occurrence; preserve saved state, audience privacy and player agency. Evidence: [targeted run](../../evidence/P06_F65_TARGETED.json).
