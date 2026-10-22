# P06-F64 — Support Thorn-Hound of the Green Root Snare

Status: SUPPORTED SOURCE-BOUND CUE; local mechanical effects held. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; implementation SHA `7518e41bde9dc0e2240053e8f2298af677b24452`.

Exact occurrence: `adversary:thorn-hound-of-the-green:root-snare`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#thorn-hound-of-the-green/features/1`; source SHA-256 `ab2498777e6340d353c26b7f72cdf99b5537a7b74509832727fb1e82861bbc2a`; template SHA-256 `635605d21fb6678134b9c6c825a216849d8ca4b8ec854ad719ccb1207103e861`.

Expose the exact Action cue in current GM-owned Hound context. Native code remains authoritative for target/range proof, the player's Agility Reaction Roll, damage, Restrained state and recovery. The cue never chooses the PC's response or rolls dice.

Changed modules: descriptor/catalog, Root Snare projector and adversary context. Fresh test `bot/tests/ai-gm-2026-10/p06-f64.test.mjs` plus mapped fresh tests for shared modules. Freeze before one targeted batch; no legacy tests/fixtures/registries or broad validation.

Local hold: no target selection, PC roll request/result, damage/condition application, freeing action or replay receipt is implemented by this context cue. Roll back only this occurrence; preserve existing state, private audiences and player agency. Evidence: [targeted batch](../../evidence/P06_F64_TARGETED.json).

