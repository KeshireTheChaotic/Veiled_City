# RF03-F03 corrective C09 ledger

Status: QUALIFIED / C09 only. Base commit: `4ac8b61`.

## Scope and authority

Native Daggerheart term validation/projection only. Existing owner consent, source freshness, scene/audience binding, persistence, and transaction behavior stay with `action-consent.js`. No new rule or restriction is introduced.

## Implementation and test evidence

Implementation: `frameworks/daggerheart/action-consent-terms.js` now owns the pre-existing resource identifier bounds, participant bounds/uniqueness, and sorted exact term projection. `action-consent.js` injects its unchanged `SCENE_ACTION_WINDOW` failure constructor and retains source, owner, session, audience, persistence, and transaction work. No rule or record format changed.

Frozen fresh test: `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c09.test.mjs`; terminal exit 0, 4 passed, 0 failed, 0 skipped, TAP duration 60.8265 ms, blocking wall time 232 ms; log SHA-256 `8b1d66a0c52e62b093d20eb7db06b82f4e48c443f6c86a6092da5e840193a821`. The cases cover exact audience/source projection and canonical arrays, invalid bounds/duplicates, and the provider delegation point. Changed JS/MJS syntax checks: 3 files, all exit 0. RF03 ratchet `node bot/tooling/architecture/check-boundaries.mjs --ratchet --phase RF03`: exit 0; 386 source modules, 0 unowned, 2,308 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `88818070fa2040cbc9e1e0acdfddf93efba83dedeb18f03231750705a3cf08db`. Source SHA-256: `action-consent.js` `d2ab210e2673b3d6cd321fcba2e6ca7f2b942ae82ef1cc12fd7b1aa6cf9a95bb`; `action-consent-terms.js` `9246814d082b28c22dec54568addda60ea77664f392b50a30688f8dc7363b223`; test `36c4a8abfa9f1442258d7d7fa5cc64530e5f40147688ba241d54da5341a97719`. Provider calls 0 / $0; Codex usage UNMEASURED. Full source-caller transaction and production persistence are not qualified by this pure contract test.

Machine-readable details: `phases/RF03/F03_C09_TERMINAL.json`, with concise terminal logs `f03-c09.log` and `f03-c09-gate.log`.

## Rollback

Revert the C09 native module, provider delegation/public export, fresh test, and this ledger/scope checkpoint together. No data migration.
