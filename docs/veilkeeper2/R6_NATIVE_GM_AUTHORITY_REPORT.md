# R3/R6 — observed native human-GM authority (slice complete)

Added native authority for explicit observed session-start and exact PC-bootstrap-review declarations. The same-client human slash event must be recent; guild/member/role/channel evidence is fetched through the installed Discord client with forced member refresh. A closed current campaign policy supplies configured GM role/user IDs and an explicit administrator fallback choice. Interaction-local GM flags are ignored. Bot accounts, wrong guild/channel, missing configured roles, stale events and unsupported operations fail. This authority grants neither PC control nor canon/inference/viewer scope.

Proofs bind the exact native operation, target, declaration/snapshot hash, principal, policy and refreshed member/channel permissions. Short leases default to 15 seconds, capped at 30. Synchronous guards check the issued proof, expiry, unchanged native declaration/policy and observed SDK membership/permission changes; they do not perform a new network fetch. Callers must refresh across asynchronous boundaries before using a lease. This bounded external-permission boundary is explicit, not a claim of distributed atomicity with Discord role updates.

An exact observed `pc-bootstrap-review` declaration can be converted to the fixed human-GM review expected by atomic PC bootstrap only when its actor/campaign/snapshot hash matches the native source. The owner/control identity comes from that native source, not GM-supplied owner fields. Session-start retains title/assembly as a scoped native declaration; no session/world/PC fiction is created in this slice. The module observes but does not install a command handler, send context, publish replies or call a model.

Modified files: new `bot/src/v2/discord-gm-authority.js`, new `bot/tests/veilkeeper2/r6-discord-gm-authority.test.mjs`, this report/hash manifest and ledger. No production/legacy route or existing test changed/retired. AI capabilities remain unchanged.

Verification complete on Node v26.13.0, worktree root:

```text
node --test bot/tests/veilkeeper2/r6-discord-gm-authority.test.mjs
9 passed; 0 failed/cancelled/skipped; 532.8302 ms
```

Outputs are in the tool transcript. The installed `GuildMemberManager.js:212–228` was inspected: forced single-member fetch performs REST instead of returning the existing cached member. Tests simulate those SDK responses with real permission bitfields. They verify observed human role, ignored forged flags, explicit administrator policy, configured human users, expiry, declaration/policy/role revocation hints, forced refresh, deleted roles/channel denial, async drift/abort, stale/foreign/bot events, teardown and an exact observed review driving actual SQLite scene/action bootstrap while PC control stays with its owner. The review integration is real native code with a simulated Discord identity/transport, not live GM quality or process qualification. Unchanged completed suites were not rerun.

Migration/rollback: no database/schema or production write. Leases are ephemeral; immutable review metadata is saved only by the existing native bootstrap receipt on execution. Closing detaches observation and revokes in-memory leases without changing roles, policy or actor state. Preserve committed review/PC receipts. This does not supply a persistent general review inbox, authenticated campaign-policy repository adapter or live GM preview/confirmation UI.

Known holds: exclusive root GM command/review/session setup composition; configured policy repository and private review presentation; session lifecycle/opening/recap; historical actor migration, remaining command/rules/GM/Blaze execution, conversational outcome/Fear continuation and independent live/process/crash qualification. R3/R6 and R0–R8 remain incomplete. Next exact phase: authenticated native session creation and reviewed GM operation routing, then remaining runtime adapters. No major-phase gate, merge/push or production deployment occurred. Completed-phase publication target remains the rebuild branch.
