# R5 — native private NPC planning service

Completed slice, 2026-11-14. All major phases remain incomplete.

The native root now composes private NPC cognition/planning/retention when inference is explicitly enabled. `npcPlanning.plan(request,{npcActorId,references,signal})` refreshes the actual source through native Discord intake before and after inference. `inspect(handle)` and `retain(handle)` refresh it again before returning or storing a private proposal. These are native backend methods, never AI capabilities or public interaction replies. Human source text establishes transport provenance only; it is not sent to the NPC as heard speech.

Opaque handles remain private to the service. Role/source/knowledge changes hold results; unavailable guilds fail before transport access. Shutdown aborts in-flight planning. No extra listener, command, ordinary model call, automatic cadence, consequence or publication was enabled. The normal audience conversation remains one call, with no private NPC records or plans.

The private prompt now explicitly distinguishes a player from their in-fiction character, addressing the demonstrated “Mira or the player” error without banning character names/direct address.

Changed files: new `npc-planning-service.js`, `native-root.js`, private NPC instructions, native cost fixture's exposed test client, new `r5-native-npc-planning.test.mjs`, graph and evidence. No table/schema/store change or legacy retirement.

152 distinct checks across23 affected files pass: five focused native-root cases (1564.7627ms) plus147 other affected checks (33030.4962ms). The expanded dependency-validation/guild case passed alone after its fixture changed (553.4118ms). Real native stores and simulated SDK data verify fresh source reads, private/ordinary packet isolation, unchanged Hope/recall, cold restart, message-edit revocation, proxy protection, zero unavailable-guild reads and shutdown cancellation. Listener count remains10. They do not prove live human authorization or actual Discord quality.

Actual local 27B non-thinking native-root diagnostic:46379.2798ms including ten simulated message reads, one call, zero retries. It planned/inspected/retained a private proposal through the composed backend. Full request/response/timing/source hashes: R5_NATIVE_NPC_PLANNING_RESPONSE.json; raw `.reports/native-npc-27b-2026-11-14T06-39-12-727Z-33a7b4a5/result.json`. No unknown secret/current player text reached the request. No Discord network/cloud calls, sends, Hope expense, recall cause or fictional time advance occurred. Backend default remains27B thinking=true; this is a separately labeled diagnostic.

This sample names Mira without adding a separate physical player and does not invent her actions. It maintains the clerk's refusal/motive. This single result does not qualify general conversation, meaningful continuity, fairness or human-like autonomy; earlier failures remain evidence. The result is a private intention, not performed NPC movement or delivered speech.

Static closure:132 native modules,94 reachable,38 uncomposed,eight legacy imports,zero missing imports and four generic tools. Private cognition and planner are now entry-reachable through this optional service.

Rollback removes the service composition while preserving private history; never reinterpret plans as executed facts or route private handles through an older audience gateway. Existing manifests need no schema migration. No major-phase merge/push or production action occurred.

Next R5: actual native fictional-opportunity sources, once-per-opportunity scheduling and response/fairness tracking, so independent NPCs can think without a player request. Current service still needs a refreshed human transport request as provenance. Rule consequences, observable disclosure and audience publication remain separate R2/R3/R4/R8 gates. Automatic world outcomes are not enabled.
