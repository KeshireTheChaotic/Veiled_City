# R3/R6 — exclusive native interaction root (slice complete)

The opt-in root composes the native death workflow and owner command gateway on an unclaimed Discord client. It refuses pre-existing `interactionCreate` listeners, routes recognized commands before delegated commands, consumes malformed new-runtime request routes without passing them to legacy code, and reserves the opaque death-button namespace for the native component path. Other command/component callbacks remain explicit trusted host dependencies. Natural message intake is separate and untouched.

Initial command authorization errors now receive a generic private denial at this root. It never edits an already public response. Unknown native buttons receive a private generic denial instead of being delegated. In-flight duplicates are coalesced; valid commands/effects retain the underlying durable claims. Denial attempts are bounded and deduplicated in memory, not certified durable across restart. Host callbacks must provide their own authorization, native receipts and replay policy. The host must not register new peer handlers after constructing this root; startup exclusivity does not monkeypatch the client to prevent later external registration.

Modified files: new `bot/src/v2/discord-interaction-router.js`, route-ownership inspection in `discord-death-commands.js`, extended `bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs`, report/hash manifest and ledger. No default startup, legacy command, registration, gameplay schema or existing test changed/retired. No new AI capability was added.

Verification complete on Node v26.13.0, worktree root:

```text
node --test --test-name-pattern="exclusive native root|native command" bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs
14 passed; 0 failed/cancelled/skipped; 5367.278 ms
```

Output is in the tool transcript. Actual native source/scene/action/prompt/decision/interaction stores, source authority and native engine run through the root from owner command to review, choice, fate and allocation. Discord client/guild/permission/send/readback/reply transport is simulated. Checks include both aliases, party-to-private routing, current session/permission denial, no implicit choice/dice on presentation, duplicates/cold claims, private root denial, malformed native requests, unrelated callback delegation, unknown native controls, startup exclusivity and listener teardown. Unchanged completed suites were not rerun. No live Discord, process/crash, complete command migration or whole-phase quality is claimed.

Migration/rollback: no schema or production database changes. The new root must replace the interaction surface in a future authorized native startup, never be installed alongside the old handler. Continue preserving all effect, prompt, source and interaction receipts. Closing this root detaches only its owned listeners; it does not delete state, alter permissions or reconnect old handlers. Production startup remains unchanged and unqualified v2 stores remain opt-in.

Known holds: reviewed stale-prompt supersession/unsaved-response recovery, command-gap repair and durable denial evidence; real session setup/late arrival/identity/import adapters; all other command/GM/rule/executor parity; conversational outcome publication/Fear continuation; authoritative migration and live/process/crash qualification. The delegated callbacks are an integration surface, not migrated implementations of all old commands. R3/R6 and R0–R8 remain incomplete. Next exact phase: explicit reviewed replacement of stale owner controls without bypassing uncertain sends or saved choices, then actual session/command/rules adapters. No completed major-phase gate, merge/push or production deployment occurred. Completed-phase publication target remains the rebuild branch.
