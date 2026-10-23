# RF03-F03 corrective C11 ledger

Status: QUALIFIED / C11 only. Base commit: `659bb4c`.

## Scope and authority

Move only current native defense input validation. No change to the existing PC-owned item semantics or damage transaction.

## Implementation and test evidence

`frameworks/daggerheart/pvp-damage-defense.js` now owns the unchanged native damage-defense validator. `pvp-damage.js` supplies its established failure constructor and keeps all source grouping, ownership, campaign/consent, transaction, mutation and receipt logic.

Fresh batch `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c11.test.mjs`: exit 0, 4 passed, 0 failed/skipped, TAP 61.2745 ms, blocking wall 238 ms; log SHA-256 `0419f953bba2bf65a5d0225494f93acb4370bbe01eb9f6c5266087c3e6df57ad`. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 389 modules, 0 unowned, 2,312 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `f3464bec587b1c9f4af5bd74ab3e1e8500212566af84287029674aae426fe887`. Source SHA-256: provider `52ccc2c1bb9dea5e16059655ca9853a09f78ed53e6d01ae290454ca3cd8b5574`; native module `8edef5be375fd968c75ccfbbf2b9dd26474ed89e10732cbc31df0ab4dc778b2a`; test `7891b27c6cb9ad35964175a17833227cfaea652936e9cf6d2c14a0b8b2736d2d`. Provider calls 0 / $0; Codex usage UNMEASURED.

This qualifies only the exact defense evidence contract. End-to-end PvP damage grouping, player approval, transaction rollback/replay, and production persistence remain unqualified. Full evidence: `phases/RF03/F03_C11_TERMINAL.json` and concise logs.

## Rollback

Revert the native defense policy, provider delegation, focused tests and ledger/evidence as one commit. No data migration.
