# C164 verification ledger

## RF04-F06 — Assembly application consumer repoint

The two application workflows now reach the original assembly planning, state, and opening functions through fixed Session ports; the Publication egress ports and World and Operations public APIs remain in use. The exact ten C164 root-import transition records are archived in `C164-RETIRED.json`. The original root provider implementations and `assembly-state.js` location remain intact.

Fresh local test: `bot/tests/ai-gm-2026-10/rf04-f06-c164.test.mjs`. It verifies cold fail-closed behavior before provider binding, forwarding through the expanded complete provider maps, assembly history and receipt scope/status guards, supported provider graph loading, uncertain legacy slot no-send behavior, and default delivery forwarding of the same `{db, guild, turnId}` envelope after queueing.

The original three-case run passed 3/3. After adding the required default delivery case, the expanded run passed 3/4: its only failure was a test expectation that omitted the two `assertCurrent` calls, which occur before the uncertain-slot guard. The test expectation was corrected. The final expanded whole-file run passed 4/4, with zero failed, skipped, or cancelled tests. Because correction was made after the added case ran, the final invocation reran the earlier three passing cases as well. Exact commands, counts, hashes and the three attempt outcomes are recorded in `C164-RUN.json`; UTC start/end timestamps were not captured at execution time.

`node --check` passed for the six frozen C164 production modules and the new test. RF04 ratchet passed with 842 modules, zero unowned modules, zero active violation groups, and zero transition errors. RF05 ratchet remains incomplete: it reported 65 active legacy module-location groups and 65 transition errors, beginning with existing Session root modules (`action-continuation.js`, `assembly-context.js`, `assembly-readiness.js`, `assembly-state.js`) and World root module `autonomous-world.js`. `git diff --check` passed; Git emitted only CRLF conversion warnings.

No inherited or historical suites were run. The new tests used feature-local in-memory fakes; they made no network or production-database calls. These results do not establish a live Discord send, full application runtime, or release qualification. RF05 remains open and release is not authorized.

Known deferred work: resolve the historical `assemblyPartsFor` responsibility before considering relocation of `assembly-state.js`; C165 workflow relocation remains separate.

Next exact phase: C165 workflow relocation, with a fresh changed-code-only scope and test plan.
