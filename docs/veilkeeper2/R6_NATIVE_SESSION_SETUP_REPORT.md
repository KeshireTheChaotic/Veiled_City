# R6 — observed human native session creation (slice complete)

Added fixed native session creation from the existing observed human-GM authority. It binds the exact session-start declaration, title/assembly hash, target session ID and GM source provenance, then atomically creates the session and empty opening scene. Assembly modes are planning occasions, never proof of PC cooperation, movement, arrival or co-location. No attendance, character assignment, control revision, resource state, world fact or generated fiction is created.

The native store can inspect active session heads inside the transaction. A new start cannot displace an existing active session or create a parallel active session through this operation. Repeating the same source reuses its immutable creation receipt, including after the original session ended and a successor started; it cannot reopen the original. GM authority and declaration are checked at both transaction boundaries. Final revocation rolls back both session and scene.

Session title/assembly/provenance are closed optional native metadata; the assembly enumeration is shared with GM declaration validation. Previous session rows remain readable. This service does not end a session, carry attendance, rebind actors, provision channels, generate an opening or install GM command routing.

Modified files: new `bot/src/v2/native-session-setup.js` and `session-occasions.js`; `scene-store.js`, `discord-gm-authority.js`; extended `bot/tests/veilkeeper2/r6-discord-gm-authority.test.mjs`; this report/hash manifest, ledger and refreshed resume handoff.

Verification complete on Node v26.13.0, worktree root:

```text
node --test bot/tests/veilkeeper2/r6-discord-gm-authority.test.mjs bot/tests/veilkeeper2/r1-scene-store.test.mjs
20 passed; 0 failed/cancelled/skipped; 532.3219 ms
```

Output is in the tool transcript. Actual SQLite scene store, human authority and existing bootstrap code are exercised; Discord membership/role/channel refresh is simulated. New cases cover exact creation/provenance, empty participants, active-session conflict, final authorization rollback, ended-session replay with an active successor and closed metadata validation. Existing source/store and GM checks remain covered. No live Discord, root GM route, complete opening/session lifecycle, process-race or whole-phase qualification is claimed. Unchanged completed suites were not rerun.

Migration/rollback: optional session JSON metadata only, no table schema or production data change. Preserve source/creation receipts and session/scene history. Older native writers may reject new metadata; do not strip provenance to force a downgrade. Disable the opt-in service/root on rollback. Session end, pending-action archival, actor/control continuity and semantic migration still require reviewed operations.

Fresh approved read-only origin check on 2026-11-03: baseline remains `1ba6c7e15db1a66ba34b36336f31437beffe44d6`; rebuild origin is `7340375cf2e0596aa274f0ebc0fdfb05656553f1`, a local ancestor. No push/merge was run in this slice and no baseline-head audit refresh was triggered. Do not infer who published remote commits.

Known holds: exclusive root GM operation routing, private previews/acknowledgements, real campaign-policy/session resolver adapters, session end/recap/assembly writer, owner registration/rebind/pre-session attendance, historical actor migration and remaining command/rules/GM/world behavior. R6 and R0–R8 remain incomplete. Next exact phase: native GM command routing for session creation and reviewed bootstrap, then full session/actor continuity and remaining runtime adapters. No major-phase gate or production cutover is claimed. Completed-phase publication target remains the rebuild branch.
