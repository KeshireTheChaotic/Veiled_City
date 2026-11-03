# R3 — native owner death review and move buttons (slice complete)

Delivered an opt-in bridge from client-observed private owner buttons to the existing fixed native death-review and death-choice operations. Native terms bind the committed final-HP cause, canonical PC/resources/control, complete actor snapshot and saved risk review. The prompt presents all three risks and disables choices with unsupported owned feature mappings. Delivery must be acknowledged with the exact payload, message and sole-owner audience before clicks are accepted. No text classifier, automatic move, allocation, scar fiction, dice or new AI capability was added.

Prompt rows and immutable observed interaction envelopes persist in dedicated SQLite files. Native SQLite insertion order supplies review/choice sequence. The source bridge authenticates the click as labelled native evidence, not PC dialogue. Fresh private audience fingerprints and native terms are checked again after asynchronous permission reads. Source authority and the existing action-store transaction validate again when staging evidence. Reopening all six stores preserves review/choice and native outcome replay without another die draw. Expired/revoked prompts or changed native terms hold unstaged evidence for reconciliation; they do not authorize a replacement fate roll.

Modified files: new `bot/src/v2/death-prompts.js`, `discord-death-decisions.js`, `rules/death-decision-ingress.js`; extended `component-choice-sources.js` and `component-decision-store.js`; new `bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs`; report/hash manifest and ledger. No production entrypoint or legacy command changed.

Verification complete on Node v26.13.0, from worktree root:

```text
node --test bot/tests/veilkeeper2/r3-discord-death-decisions.test.mjs bot/tests/veilkeeper2/r3-component-choice-sources.test.mjs bot/tests/veilkeeper2/r3-component-decision-store.test.mjs bot/tests/veilkeeper2/r3-component-outcome-chain.test.mjs bot/tests/veilkeeper2/r3-discord-cost-decisions.test.mjs
17 passed; 0 failed/cancelled/skipped; 2595.2436 ms
```

Output is retained in the tool transcript. These are actual SQLite/action/source-authority modules with a simulated EventEmitter Discord client, permission responses, native attack/Armor certificates and delivery acknowledgement reader. Wrong owner, unobserved event, altered body/bot/message/channel, undelivered/expired/revoked prompt, stale actor terms, permission drift, mutation during asynchronous reads and unsupported feature choice fail. The existing native Hope component chain remains covered. This does not prove live Discord delivery or whole-phase parity.

Holds: prompt sending/readback, Discord interaction acknowledgements, public/ephemeral and command routing, owner recovery-allocation UI, native imported actor/rules readers, full feature mappings, actual GM/Blaze executor, crash/race qualification and production canonical migration remain open. The native factory dependencies must be wired by trusted application code; these functions are not model tools. Full receipt disclosure endpoints still require authenticated caller authorization. Prompt token lookup currently scans the dedicated prompt table; real deployment needs bounded retention/indexing if volume warrants it, preserving durable decisions/receipts. No old runtime or test was removed.

Migration/rollback: one new dedicated prompt database, no production schema mutation; the existing component envelope schema is unchanged and gains a read-only rowid sequence accessor. Existing cost envelopes remain usable. Do not overwrite a shared cost database with a separate death database at integration: sequence/order assumes the configured native envelope store. Old code leaves new prompt files unused; preserve all decision, prompt, source and action files together for recovery. Synthetic cold-store tests demonstrate local replay, not a reviewed production migration. No deployment, live send/model call, completed-major-phase merge or push occurred.

R3 and R0–R8 remain incomplete. Next exact phase: finish R3 native death prompt publication/readback and explicit recovery-allocation ingress, then actual GM/cost/executor adapters and wake/recovery. User-directed publication target remains `rebuild/veilkeeper2-audience-first`, never the frozen baseline.
