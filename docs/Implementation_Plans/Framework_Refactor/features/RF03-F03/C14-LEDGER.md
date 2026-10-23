# RF03-F03 corrective C14 ledger

Status: QUALIFIED / C14 only. Base commit: `ffc736c`.

## Scope and authority

Extract only exact PC attack loadout/range/damage/Evasion terms. Owner authorization, scene facts, native dice and committed effects remain with current providers.

## Implementation and test evidence

`frameworks/daggerheart/pvp-attack-terms.js` now calculates exact unarmed/weapon damage terms, range and target Evasion from current inputs. `pvp-attacks.js` supplies the native range-band list and existing failure constructor only; all source, owner, consent, presence, line-of-sight, rule, modifier, Fear, RNG and receipt checks remain there.

Fresh batch `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c14.test.mjs`: exit 0, 4 passed, 0 failed/skipped, TAP duration 63.7534 ms, blocking wall 246 ms; log SHA-256 `91c822093a44cb5cb8d3d037e939390b8f06f2e645412b1d55035760b0e31226`. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 393 modules, 0 unowned, 2,317 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `17ccacf955da17090aebb8b620031bcaaad3253f76da97099a626eea7a34d2a8`. Source SHA-256: provider `6d2866b627494f6152ffc26d09d762615f361b7c5f137cae35a602cd2a617c94`; native module `098e22e0f18dfe7c4f6889488b483249a968f0b34b310200b0f879fb39981ba3`; test `48a9f7875ee2509330d0b337b1fe0c6e7cc572fe22e72dc7a3e6abb70fbe7076`. Provider calls 0 / $0; Codex usage UNMEASURED.

This qualifies the calculated attack terms only. Current presence/range evidence, owner consent, native roll, Fear, target approval, state transaction, and replay are not newly qualified. Full terminal evidence: `phases/RF03/F03_C14_TERMINAL.json` and concise logs.

## Rollback

Revert native terms, provider delegation, test and ledger/evidence together. No state migration.
