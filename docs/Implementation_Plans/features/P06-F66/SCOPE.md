# P06-F66 — Clause-Eater Conflicting Duty

Status: SCOPED; implementation waits for P06-F65 test execution checkpoint. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; catalog review base `2c84351b311c51ad79ac6f05f4668b6f3a9afdcd`.

Exact occurrence: `adversary:clause-eater:conflicting-duty`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#clause-eater/features/1`; occurrence hash `3be0f926c2e75572d68368365c225ea1274c28f6668ed07f2a8c25ef0211c4ed`; template hash `c2923812a24566e4ca25120a7dd760ff9af2b409a47346cfc8ea6eca1ae59297`.

Expose only an exact source-bound Action cue in current GM-owned Clause-Eater context unless a fully native effect pathway can be qualified. Preserve source mechanics: Fear cost, Presence Reaction Roll (15), and on-failure choice among 2 Stress, 1 Hope, or Vulnerable until the PC publicly states an obligation priority. Native code must adjudicate the roll/effects; the PC alone makes the consequence/resource choice. No new limit on narrative output, GM creativity, NPC/faction autonomy or invention.

Planned changed modules: descriptor/catalog, Clause-Eater cue projector/adversary context, fresh F66 tests, F01 counts and coverage map. Freeze before one mapped fresh-only batch. No legacy tests/fixtures or broad validation.

Local holds: actual Fear transaction, targeting/roll lifecycle, player choice UI, Vulnerable duration/recovery, public-audience privacy and replay. Roll back only this occurrence; preserve saved state, privacy and player agency.
