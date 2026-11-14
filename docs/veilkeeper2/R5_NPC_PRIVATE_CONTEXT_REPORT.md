# R2/R4/R5 — private NPC cognition boundary

Completed slice, 2026-11-14. All major phase gates remain incomplete.

`npc-private-context.js` issues a separate opaque native grant for an active, independent NPC's private cognition. Unlike audience portrayal, it can contain that NPC's independently recorded secret motives, goals and beliefs. It requires the actual actor in the current scene and actor-known metadata across the entire source closure before reading any selected body. Unknown GM truth, other actors' private records, pending disclosure, current player text, unproven human-statement origins, cyclic/missing ancestry and stale/retracted sources are excluded or invalidate the grant. Testimony and belief keep their epistemic kinds.

Private actor grants are not audience grants. The audience model gateway now explicitly rejects GM/NPC-private packets before any provider call, including accidental adapter misconfiguration. Only the optional NPC private decision planner accepts the new namespace. Its output remains a private proposal with no execution, disclosure or knowledge authority. The context adapter does not infer NPC knowledge from imported GM hooks, player thoughts or model assertions.

Residual human proxy roles/delegations no longer qualify an NPC as independent even when its controller field is temporarily empty. Both context adapters reject that ambiguity; scene prose screening conservatively protects the proxy's actions. Harmless NPC direct address and descriptive second person remain supported by the unchanged ordinary conversation path.

## Delivered files and actual verification

New `npc-private-context.js`; changed `npc-decision-planner.js`, `context-authority.js`, `model-gateway.js`, `scene-prose-review.js`; new `r5-npc-private-context.test.mjs`; dependency graph and report/hash/response evidence.

245 distinct checks across36 affected files pass: five private-cognition cases (74.9241ms) and240 other import-dependent checks (33048.525ms, concurrency4). Real native SQLite fixtures cover private motives and false beliefs, audience isolation, pre-inference private-packet rejection, stale private plans, source ancestry and proxy ambiguity. Provider/SDK transport in these checks is simulated, not live play.

One actual qwen3.5:27b non-thinking diagnostic returned a private proposal in48292.6113ms,4096 output-token cap/90000ms timeout, one call and zero retries. It read exactly two authorized NPC-private records (the decoy secret and motive), zero unauthorized bodies, and no current player message. Full synthetic request/response/timing/source hashes: R5_NPC_PRIVATE_CONTEXT_RESPONSE.json; raw artifact `.reports/npc-private-27b-2026-11-14T06-14-47-188Z-72df9b9a/result.json`. No Discord/cloud calls, publication, effects or ordinary audience inference occurred. This separate diagnostic does not alter the backend's27B thinking=true default.

The proposal uses the supplied employer motive and declines to release the parcel; it invents a ten-minute departure and contractual explanation. These remain uncommitted private intentions/claims. It is not a verified timetable, contract, disclosure license or social outcome. One proposal does not qualify conversational quality, sustained continuity, impartiality or live GM behavior.

Static graph:131 native modules,91 reachable,40 uncomposed,eight legacy imports,zero missing imports; four generic AI capabilities retained.

## Holds, migration, rollback and next work

The private adapter and planner remain uncomposed in the root. No automatic new inference, action or publication is enabled. Private goals require an actual native actor-knowledge source; GM awareness alone is insufficient. Offscreen/faction cognition, authentic perception/IC-speech issuers, durable intentions and fictional-opportunity scheduling remain open. Current player text is intentionally absent until independently witnessed content is established; there is no mandatory typed-intent classifier. Closure/record bounds remain finite and need large-history qualification.

No schema/data migration or legacy retirement occurred. Old NPC version1 audience manifests remain held under the preceding hearing policy; private-cognition version1 is a distinct namespace and cannot be substituted for them. Preserve all private proposal/history artifacts. Rolling back this slice must not route private packets through an older audience gateway; keep the inference hold until the boundary is restored.

Next R5: retain source-bound private proposals as proposals, never memories of completed actions, then implement genuine fictional opportunities, pending response windows and fairness before native consequences. R3 mechanical readiness and R4/R8 human quality/publication gates remain independent. No major-phase merge/push or production change occurred.
