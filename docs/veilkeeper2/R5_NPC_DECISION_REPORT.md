# R2/R4/R5 — actor-limited NPC decisions

Completed native slice, 2026-11-13. R5 and all other major phases remain incomplete.

## Delivered behavior

The existing NPC context adapter correctly intersected actor-known records with audience entitlement, but copied the current player message into the packet regardless of whether the NPC heard it. A private thought or OOC statement could therefore reach an actor-specific inference. `context-authority.js` now leaves that utterance empty for NPC packets. Known, entitled testimony and its epistemic kind remain available. The ordinary conversational GM still receives the actual player message and retains its one-call path.

NPC dependency manifests now use version2. Old version1 NPC manifests hold because their drafts may have included unheard text; ordinary GM manifests remain version1. Existing stored history is preserved. This does not establish a new witness/IC-speech issuer: current messages cannot silently become NPC knowledge.

`npc-decision-planner.js` adds one optional native actor-limited private planning call. It accepts only opaque current independent-NPC grants, refuses human-controlled proxies and GM grants, checks source/actor/knowledge before and after inference and when inspecting a result, and returns a frozen private proposal handle. Instructions encourage distinctive voice, independent wants, initiative, refusal, waiting, mistakes and genuine inaction while preserving PC choices and unresolved opportunities. No tools, execution, disclosure or knowledge authority are granted. `conversation-input.js` serializes actor packets as data without the ordinary GM-facing instruction to address players.

This planner is deliberately not root-composed or scheduled yet. It is not a new AI-callable capability. It cannot commit plans, NPC speech, scene events, dice, resources or canon. The ordinary root GM's broader semantic quality remains unqualified.

## Verification

217 distinct checks across32 affected files pass:13 context checks (52.52ms), five fresh native-SQLite NPC planner checks (79.3474ms),192 other context-dependent checks (29900.1472ms), and a later37-check formatter selection (2630.7783ms). The latter selection overlaps four previously checked files and adds seven distinct checks in two files; do not sum overlapping runs as release qualification. Both affected selections and their union are recorded. Provider tests use simulated transport.

Coverage includes private/current-message canaries excluded before body reads and inference; limited actor knowledge; testimony preservation; human proxies; forged handles; source edits; retracted knowledge; provider failure; unsupported tool responses; abort without retry; manifest downgrade holds; ordinary GM packet compatibility. No legacy runtime/tests were reused or retired. Static graph:127 native modules,88 reachable,39 uncomposed,seven legacy imports,zero missing imports; four generic AI capabilities unchanged.

Actual 27B results: thinking=true returned no prose in either case, failing at90018.3931ms and90008.3165ms. A separately labeled thinking=false diagnostic returned private proposals at24376.8428ms and27792.8133ms. Both profiles used4096 output tokens,90000ms timeout, one call per case and zero retries. Four calls total, zero effects/Discord/cloud/sends. Full synthetic requests, exact responses, source hashes and failures: R5_NPC_27B_RESPONSE_LOG.json. Raw runs remain under `.reports/npc-decision-27b-2026-11-14T05-31-39-936Z-eea82988` and `.reports/npc-decision-27b-nonthinking-2026-11-14T05-35-38-264Z-6e770070`.

Non-thinking proposals use the supplied ledger-based voice, initiate an offer or refuse a courier, and leave Mira's choices open. They do not expose the private/current-message canaries. They invent precise tram times and a signature condition; these remain proposed NPC claims, not authoritative scheduling, consent or player obligations. Neither sample qualifies sustained continuity, fairness, autonomous world decisions or human play. Ollama reported19GB with27% CPU/73% GPU and context65536; this is observed placement, not a performance diagnosis. The backend default remains thinking=true; the diagnostic did not change production configuration. Do not rerun unchanged cases.

## Holds, migration, rollback and next work

The actor packet currently permits the intersection of actor-known and audience-entitled records. NPC-only private goals/knowledge need a separate explicitly private cognition source; this adapter must not be widened to expose them to the audience writer. Authenticated perception/witness evidence, durable goals/plans/decisions, fictional-opportunity scheduling, pending player response windows, attention fairness and source-validated action/knowledge proposals remain open. No random wall-clock advance or player-silence consent is implemented.

No schema or data migration occurred. Old NPC version1 manifests require explicit quarantine/review, not a blind version bump. Preserve all old drafts/journals. Rolling back to the older verifier cannot safely release old NPC drafts; retain the hold. New version2 manifests are rejected by older code. No automatic NPC publication is enabled.

Next R5: private cognition sources and durable fictional-opportunity/response tracking, then integrate native proposals through actual rules authority and independently scoped observable portrayal. R3 full mechanical readiness and R4 sustained human-like conversational quality remain independent prerequisites for autonomous consequences and publication. Export format/import compatibility remains an R6 requirement.
