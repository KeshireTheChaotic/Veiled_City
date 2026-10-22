# P07-F25 — Ledger

**Status:** COMPLETE — frozen corrective regression union passed. This closes evidence capture only; P07 remains PARTIAL because F21's native non-conversation producer is absent and other acceptance rows remain open. Baseline `77c6ba23567f6ba56e4a21ffbdeb39666f05c4dc`.

| Evidence | Result |
|---|---|
| Frozen union | One blocking invocation: `node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p07-f13.test.mjs bot/tests/ai-gm-2026-10/p07-f14.test.mjs bot/tests/ai-gm-2026-10/p07-f16.test.mjs bot/tests/ai-gm-2026-10/p07-f17.test.mjs bot/tests/ai-gm-2026-10/p07-f19.test.mjs bot/tests/ai-gm-2026-10/p07-f20.test.mjs bot/tests/ai-gm-2026-10/p07-f22.test.mjs bot/tests/ai-gm-2026-10/p07-f23.test.mjs bot/tests/ai-gm-2026-10/p07-f24.test.mjs`; exit 0, 14 passed, 0 failed/skipped/cancelled/todo; Node duration 5443.5696 ms. |
| Checks | `node --check` for the changed bridge, fixture and all nine union tests passed. `git diff --check` passed. No legacy suite, broad validation, CI, paid provider, production service or production DB ran. |
| Cost | F24's two workflows used four deterministic injected responses total; no new production model call or cache change. Final batch runtime is local SQLite/mock duration, not live latency/cost. |
| Hashes at freeze | Handoff `DEFCA6D20B9650C75539489487DFED4E46DC3F067A57820FC7D90C37C7094A02`; bridge `5066A9E5E250A17DFD14E72B460230724F7EF6E3D0F95DD84686814621F4550A`; fixture `974E651C313A7C15FFB72AA570D60F288B77B1F64DB426932A0679872A74DC5E`; coverage `B9605FEF449C359D9F8F635B60C4EA084CE34AF3BB5293B9E78999ED3A3BEDBB`; F24 test `C6041B136305F922C30961D8B085789564F1DD63662978394D5E4215E528C7E9`. Earlier test hashes remain in their feature ledgers. |
| Commit | `77c6ba23567f6ba56e4a21ffbdeb39666f05c4dc` — `test(p07): verify native writer publication recovery`. F25 closeout commit recorded in phase ledger. |

## Corrective acceptance matrix

| Case | Result |
|---|---|
| T01 urgent mandatory response vs. >4 optional candidates | NOT TESTED in this union. |
| T02 distinct character-only interests/urgencies | NOT TESTED. |
| T03 same-NPC overlap vs. one-PC optional speech | PASS, F22 authenticated source/ranking test. |
| T04 exact independently linked non-speech incident | LOCAL HOLD, F21: no authorized source-link producer exists. |
| T05 capacities 0/1/3/4 | PARTIAL PASS, F20 validates narrative-unit capacity/omission accounting; it does not model every committed/native consequence class in the handoff. |
| T06 five-plus established proofs / honest counts | PASS for eight accepted scene proofs (4 emitted, 4 omitted, 0 held); invalid/stale sources remain held. |
| T07 stale saved source after DB reopen and revocation | PASS for persisted source hash/replay then revoked-source rejection, F23. |
| T08 attendance, audience and scene change | PASS for attendance/audience/scene stale-signal rejection, F23. Owner-control revision is NOT TESTED. |
| T09 private speech with another PC present | PASS for owner-private boundary and revoked public source, F17. |
| T10 actual deterministic writer acceptance | PASS: real GMService Director + V9 writer injection → native accepted unit, F24. |
| T11 delivered/not-sent/uncertain outbox | PASS for mocked known-not-sent retry, uncertain reconciliation, restart, and duplicate reads, F24. No live Discord. |
| T12 Director no-op | NOT TESTED by this union. |
| T13 deterministic repeated reads | PARTIAL PASS through F22 source-order determinism and F23 replay equality; no full repeated ranking/omission matrix. |
| T14 forged incident or GM-only source | NOT TESTED for a non-speech incident; no incident signal is emitted absent F21 producer. |

F25 is evidence closure, not semantic GM quality proof, full P07 completion, or deployment approval.
