# P07-F20 — Ledger

**Status:** COMPLETE — omission accounting repaired and source-backed capacity behavior passed. Baseline `d4f3ffe78e5a06e7402fc9fbe6cf1e2dc66b74fe`; commit SHA will be added in phase closeout.

| Evidence | Result |
|---|---|
| Defect | `worldDirectorBridgeBeats` stopped the native narrative-unit loop at four before validating/counting the remaining proofs. Other sidecars also counted capacity overflow before proving each candidate current. |
| Repair | Continue through bounded eligible proof lists; validate each candidate, then increment `omitted` only for valid overflow and `held` for invalid/stale evidence. No ordering or cap changes. |
| Fresh tests | Final blocking batch: `node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f20.test.mjs`; exit 0, 2 passed, 0 failed/skipped/cancelled/todo; Node duration 2173.2055 ms. Changed bridge/test `node --check` exit 0; `git diff --check` passed. Test SHA-256 `80A7FFB16D3E3C625988C5CF9A4F69711AC91A10482EFA158A1019456C5D48C8`; production source SHA-256 `5066A9E5E250A17DFD14E72B460230724F7EF6E3D0F95DD84686814621F4550A`; coverage SHA-256 `D36CA9E630A77ABF933FAED48C14ECDAE57FECDEC0BE6AE012A6192A05D56FB0`. |
| Scenarios | Capacity 0/1/3/4 with two actual same-NPC optional speech signals: output beat counts 2/3/4/4 and omitted counts 0/0/1/2. Eight genuinely accepted owner-source scene units: 4 beats, 4 omitted, 0 held. All projected beats retain execution/publication authority false. |
| Failed batches | Initial batch failed because the Director-originated writer fixture was not owner-authored provenance and did not produce accepted unit receipts. First repair attempt had a test syntax error. Next run exposed an extra optional speech hint included in the eight-proof expected count; fixture was replaced with actual `captureWorldInput` + authored-turn provenance for that case. The final batch above passed; failures are retained here. |
| Cost | All authoring responses injected offline. No live provider, Discord, network, CI, or production DB. |
| Cost | Native authoring stub used offline; no paid/live provider, Discord, network, CI, or production DB. No extra model request added and no cache changes. |
| Risk / hold | This proves beat capacity accounting and currently accepted native scene units. It does not exercise committed consequences, observations, encounters, stale proof sidecars, or cross-process data. |
| Rollback | `git revert <F20-commit>`; no schema or persisted production state changes. |
