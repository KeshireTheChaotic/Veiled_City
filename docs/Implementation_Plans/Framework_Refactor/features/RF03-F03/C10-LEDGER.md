# RF03-F03 corrective C10 ledger

Status: QUALIFIED / C10 only. Base commit: `9150988`.

## Scope and authority

Extract current Daggerheart final-HP/resource eligibility and owned death-feature mapping policy only. `pc-death.js` retains owner authentication, source ancestry, dice, transactions, mutations, recovery allocation and receipts. No new move or automatic choice is introduced.

## Implementation and test evidence

`frameworks/daggerheart/pc-death-eligibility.js` owns the exact existing final-HP/resource bounds and owned death-feature mapping hold. `pc-death.js` injects its established `PC_DEATH_MOVE` failure and retains source proof, owner action, dice, recovery allocation, synchronous transaction, mutations, and receipts.

Fresh batch `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c10.test.mjs`: exit 0, 3 passed, 0 failed/skipped, TAP duration 62.5751 ms, blocking wall 237 ms; log SHA-256 `eab4ffbe774be8df00a8c9b448d7e0949368161c07a2ed90c355f951727b6dff`. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 388 source modules, 0 unowned, 2,311 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; log SHA-256 `fbb89630154bee7872f79e3b98a11040455be2b956cbeffad79781e6b6cebe32`. Source SHA-256: `pc-death.js` `dc6d24d711fde692700e69be0ffa6169355671695810dbe384e32431a28108f3`; native policy `19baddd2cb23af629656c69f80b583d081ccff9f2c97d64f418ac5f4e0cfa4bf`; test `a00bc35fbbb02b88dc6f61e116fc1d8f9efd2c7956bff1054fe934228ecbd620`. Provider calls 0 / $0; Codex usage UNMEASURED.

The tests qualify precondition/ownership mapping only. Owner-authenticated transactional death resolution, replay, recovery and live delivery remain unqualified. Full evidence is in `phases/RF03/F03_C10_TERMINAL.json` and its concise logs.

## Rollback

Revert only this native policy/provider/test/evidence checkpoint together. No state or schema migration.
