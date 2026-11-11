# R3/R4/R7 generic native engine integration — slice complete

The four-capability kernel can now execute one fixed native operation, `hope_cost.commit`, through `action_propose`, and retrieve its committed receipt through `state_inspect`. This delegates to the existing atomic Hope authority. Models provide references, never amounts, outcome JSON or arbitrary state patches. Full R3 mechanics and the R0–R8 phase gates remain incomplete.

The native service requires a current owner-private source, canonical PC ownership/control, registered action terms, actual accepted native consent, and either the original action source or its exact authenticated owner-choice source. Native source/lifecycle and cost validators run again inside the atomic commit. Replay returns the existing receipt without a second debit. Receipt projection excludes full resource pools, sheets and GM hooks, and is explicitly owner-private with no NPC knowledge. Party disclosure requires separate authorization and is not implemented here.

Rehearsal remembers only native receipt references and hashes actually returned through tools, rechecks them during continuation and before queuing, and persists them in the publication identity. Cold draft publication revalidates every saved receipt against the native store, current owner and audience before send claims. Historical drafts missing receipt lineage remain held. A later held draft does not undo an already authorized native event or justify retrying its effect.

Modified runtime files: native-action-authority.js (new), kernel.js, rehearsal.js, publication-queue.js, native-root.js and native-draft-publication.js. New focused engine tests and updated GM/context/source-publication fixtures accompany the affected-test and source/test SHA-256 manifests. The new online-native-cost-check.mjs is an opt-in, synthetic in-memory diagnostic with no Discord connection or real campaign effects.

## Completed verification

Node v26.13.0: 198/198 affected behavioral checks passed across 21 files. The final focused 12/12 engine checks passed in 363.3745 ms; the remaining 186/186 passed in 26380.533 ms. Earlier superseded batches are not added. Unchanged passing tests were not rerun. Coverage includes consent refusal/revocation, canonical ownership before receipt bodies, private accepted-choice execution of an originally shared action, party receipt refusal, replay, exact native Hope math, rollback on final guard failure, async-handler rejection, stored receipt reopening, receipt drift, tool continuation and one-call ordinary speech without effects. Resource-store reopening uses real SQLite; scene/source fixtures remain in memory in that particular check and do not establish full application restart. Discord/model fixtures in these behavioral tests are simulated.

Actual local Ollama evidence is retained in qualification/:
- GM-runtime probe: one model call, zero tools, 9245 ms. It invented scene/PC actions instead of executing the requested tool. Hope remained 3. Failed orchestration and agency quality; nothing sent.
- First explicit transport control: two calls, one tool, 2328 ms. Model sent literal optional revision "string"; native engine refused stale_revision. Hope remained 3. This is a useful refusal, not successful orchestration.
- Corrected transport control explicitly omitting optional placeholder fields: two calls, one tool, 2140 ms. Actual native receipt returned, Hope 3→1, one persisted receipt dependency, sent=false. Successful synthetic transport/engine integration only.

These are real qwen3.5:4b requests to local Ollama with real native validators and synthetic accepted-consent fixtures, not evidence of a real Discord human consenting, semantic validation or live GM quality. No automatic publication enabled; no diagnostic prompt applied to the running bot. The first probe predates trace/variant instrumentation in the retained diagnostic script; later controls include it. All three results are retained, including failures.

## Migration, rollback and holds

No SQL schema change, legacy retirement, production mutation or running-bot restart. New drafts include receiptDependencies; prior drafts are not silently backfilled, re-inferred or granted empty dependencies. Publication adapters now require inspectReceipts; custom native action adapters need synchronous fixed validators and immutable evidence. Preserve existing stores and disable publication before rollback: older code does not enforce this lineage. The test-only process remains an earlier loaded snapshot.

Only accepted, previously registered Hope costs are bridged. Ready-operation discovery, regular Hope consent UI, Blaze composition, other engine families, complete SRD/house-rule parity, historical migrations and full crash/restart/outbox acknowledgement remain open. Receipt proof establishes factual native events, not the semantic accuracy or authority of arbitrary prose. Native paragraph review still requires semantic approval. Current local model fails ordinary GM tool selection and PC agency; do not infer readiness from the positive control.

Next exact R3/R4/R7 work: bind observed receipt evidence to narrowly matched consequence assertions in material review without treating regex screening as semantic authorization; compose the remaining fixed native operations and consent workflows through the same four tools. Then qualify repaired-candidate publication/ack and full phase gates. All major phases remain incomplete; this is a scoped local commit, not a major-phase integration/push.
