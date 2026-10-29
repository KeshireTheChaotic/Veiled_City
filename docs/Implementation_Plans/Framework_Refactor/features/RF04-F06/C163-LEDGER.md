# C163 ledger

## RF04-F06 — Publication opening egress slots

Added three fixed Publication ports for the original opening output preparation, publication queue, and queued delivery functions. The root implementations bind their existing functions at module load. Publication implementations remain at their original paths, and Session policy remains in its providers; the application workflows now call the Publication public slots. The production entrypoint and focused startup composition already load all three provider modules. C163 retires six exact transition records; their original records are preserved in `C163-RETIRED.json`.

Modified production files: `bot/src/pvp-output.js`, `bot/src/publication-outbox.js`, `bot/src/publishing.js`, `bot/src/opening-entry.js`, `bot/src/opening-cohort-runner.js`, `bot/src/frameworks/publication/public.js`, and `bot/src/frameworks/publication/contracts/opening-egress.js`. The fresh local test is `bot/tests/ai-gm-2026-10/rf04-f06-c163.test.mjs`.

The fresh targeted batch passed 4/4, exit 0, with 0 failed, skipped, or cancelled tests. The first attempt passed 3/4; its sole failure was a test-only assertion mismatch because fixed-port fail-closed errors are thrown synchronously. The test was corrected from `assert.rejects` to `assert.throws` and the batch was rerun once. Cases verify raw ESM imports of both opening workflows without a cycle initialization error; manual and party no-op cohort paths without egress; cold port failures, all three provider bindings, replacement denial and exact downstream delivery error identity; and provider module reachability from production and focused startup. All seven changed C163 production modules and the test passed `node --check`. Exact commands, timestamps, results and hashes are in `C163-RUN.json`.

Architecture ratchets at the final metadata freeze: RF04 passed with 842 modules, zero unowned modules, zero active violation groups and zero transition errors. RF05 failed with 65 active legacy module-location groups/errors, beginning with session-owned `action-continuation.js`, `assembly-context.js`, `assembly-readiness.js`, and `assembly-state.js`, plus world-owned `autonomous-world.js`. These failures remain open outside C163. `git diff --check` exited 0 with only CRLF conversion warnings; `TRANSITIONS.json` parsed successfully.

Known limits: tests establish the fixed egress bindings and bounded uncomposed no-send/status paths, not a live Discord send or full application runtime. C164 and subsequent publication work remain deferred. C164's assembly-state move still needs a separate ownership resolution. RF05 remains incomplete and release is not authorized.

Next exact slice: C164 repoint assembly workflows through existing owner ports without relocating assembly state. The later assembly-state relocation still requires resolution of the legacy delivery-part dependency.
