# P10-F05 — Creative private entry and truthful authoring failure handling

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 5 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Replace the normal Billy Corgie-style dump of two `entry_hooks` with an authored playable opportunity, while retaining only owner-entitled material and never pretending that failed authoring succeeded.

**Implementation.** Remove silent `catch {}` around `gm.authorOpeningEntry` in `opening-entry.js`; capture stable redacted error category and stage, not prompt/provider-secret text. Distinguish provider/parse failure, stale authoring source, zero returned units, all units held at native validation, and successful accepted unit. Expose authoring/fallback evidence in `opening_entry_delivery` and GM status, not unsolicited player diagnostics. Guide `creativeBrief` with owner-safe hook *meaning* and saved position only if entitled, without placing owner hook verbatim in outgoing text or party packets. Ensure normal output is concrete scene detail/ordinary NPC initiative/lead, and no PC reaction, movement, disclosure or compelled answer. An authoring failure may use a truthful minimal owner orientation only after source-safe checks; do not deliver list-like raw hook text as a disguised successful narrative. Do not make model output a fact/effect receipt. Reuse native typed unit validation and avoid new creative censoring.

**Source seams.** `opening-entry-context.js`, `opening-entry.js`, `opening-entry-evidence.js`, `pvp-output.js`, `gm.js`, `narrative-authority.js`, `narrative-authority-context.js`. Confirm whether the existing writer packet already admits owner hook tasks; change only missing seams. Preserve historical fallbacks as historical acknowledged records.

**Tests.** New `p10-f05.test.mjs`: owner safe-hook guidance generates accepted original narration without hook quotation; GM-only imported hook canary never crosses; injected writer exception retains redacted diagnostics and truthful fallback; one held unit differs from accepted unit; owner auth revoked during await blocks send; repeated check-in retains exact prior acknowledgment; public packet cannot see private hook.

**Gate.** Real changed production route emits authorized narrative units on mocked valid writer output; failures are diagnosable; fallbacks cannot be counted as verified authored scenes. Offline tests cannot prove organic prose quality; mark human/model qualitative review separately unqualified.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f05.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
