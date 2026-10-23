# RF03-F03 corrective C12 ledger

Status: QUALIFIED / C12 only. Base commit: `3d13982`.

## Scope and authority

Move only the unchanged native damage-profile terms validator. Owner lookup and simulation-clock reads stay explicit provider capabilities; signatures and transactional records stay in the provider.

## Implementation and test evidence

`frameworks/daggerheart/pvp-profile-terms.js` now owns exact v3 damage-enabled terms validation, participant/owner distinctness, target edges, mandatory boundaries, native policy fields, and normalized term projection. `pvp-profiles.js` supplies `controlledOwner` and the current simulation minute; source/history verification, signatures, records, notices, and transactions remain there.

Fresh batch `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c12.test.mjs`: exit 0, 4 passed, 0 failed/skipped, TAP duration 62.4318 ms, blocking wall 240 ms; log SHA-256 `03d53e5314a54b40718dbeae2f1f762e58426e072e2d1cabf8df8452dfc411c1`. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 391 modules, 0 unowned, 2,314 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; log SHA-256 `3f9e1a1b883f31ee0b1f4a3996e31a1e124800c74e75a25d731e49743dfaaa98`. Source SHA-256: provider `6a1b1592ce949306c5e5433868541e2025c84e898c7c7407287267c7c902d7ea`; native contract `a703984dbdb29f3206eb76af1d87ba237602d300a97f5c7e13770af00a8dcf09`; test `b0047827af8895572830e8f31852f0207a1efe266c855bab74c9259798c09f64`. Provider calls 0 / $0; Codex usage UNMEASURED.

The tests do not qualify owner authentication against live storage, profile signatures, notices, database transactions, or full PvP execution. Exact evidence: `phases/RF03/F03_C12_TERMINAL.json` and its concise logs.

## Rollback

Revert the native validator, provider delegation, test and ledger/evidence together. No persisted data change.
