# Typed-Intent Delta v8 Audit

## D00 evidence

- Starting HEAD: `2dc347a77e1fd4988856b8e578e5c148fe82cb24` on `codex/typed-intent-refinement`.
- User-provided v8 plan, kickoff, Session 2 matrix, source audit and CSV were present as untracked inputs and preserved.
- The original `CODEX_TYPED_INTENT_DELTA_v7_PACKAGE.zip` was available in Downloads. Its complete D00-D08 checklist was reconciled; v8 adds H01-H05 and retains the v7 T03.1/private-roll requirements.
- `npm ci --ignore-scripts`: 37 packages installed, 38 audited, zero vulnerabilities.
- `npm run check`: pass; 211 modules/scripts and 24 root commands.
- `npm run validate`: pass; 85/85 suites, network denied, `live_requests=0`, `billable_tokens=0`.

### Sanitized red-first reproductions

The sanitized fixture is derived only from the supplied planning documents. It contains no production IDs, database rows, secrets or character packets.

| Script | Covered findings | D00 expectation |
| --- | --- | --- |
| `session2-replay-test.mjs` | F01-F05; S2-06, S2-17, S2-21, S2-24 | Fails until H01-H04 land |
| `session2-message-contract-test.mjs` | F06-F07; S2-01 through S2-03 | Fails until H05 lands |
| `v7-delta-baseline-test.mjs` | F08, F10-F13 | Fails until D01, D03, D05 and D06 land |

These scripts are deliberately excluded from the mandatory default validator during D00. Each owning phase must turn its cases green and register the appropriate suite. A failure is reproduction evidence, not a waived release gate.

### Authority and rollback

D00 adds fixtures, tests and documentation only. It introduces no runtime behavior, schema, database record or Discord interaction. Rollback is a file-level revert. Accepted typed intents remain canonical adjudication inputs; human declarations own intent; native receipts own outcomes.
