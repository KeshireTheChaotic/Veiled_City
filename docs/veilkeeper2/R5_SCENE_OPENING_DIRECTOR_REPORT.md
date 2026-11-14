# R5 — scene-opening private Director

Completed slice, 2026-11-14. All R0–R8 major phases remain incomplete.

## Delivered

`scene-opening-director.js` plans from a committed native scene opening or reopening, without a player message or present player. Its source is a separate private world-opportunity namespace, derived from current scene/session/history. It cannot impersonate a PC source or authorize gameplay effects. The actor-scoped private context still requires independently recorded NPC knowledge and rejects human proxy reservations.

The Director claims each opening/NPC pair durably before inference. Repeated consideration, restart or a failed/uncertain model attempt cannot blindly repeat that opportunity. Consideration favors less-considered NPCs across openings; this is background planning attention, not player initiative or factual authority. Each call attempts at most1–4 plans (default1). NPC roster/context overflow holds for curation. Model text may choose waiting or refusal; it remains an unexecuted private proposal.

The native root composes the service. Automatic post-commit cadence is separately opt-in with `VK2_DIRECTOR=1`; default is off. Hooks run only after a fresh active lifecycle transition, never every message, attendance update or wall-clock interval. Optional planning failures cannot roll back the committed scene or create a public error reply. The ordinary audience path and four generic AI capabilities are unchanged. No NPC movement, speech delivery, resources, clock advancement or irreversible outcome is committed.

## Files and checks

Changed: new Director module; `knowledge-store.js` metadata discovery/opportunity claims; `scene-store.js` bounded NPC discovery and optional post-commit callback; `native-root.js`, `native-start.js`; native fixture Director option; new Director tests, explicit startup opt-in test, dependency graph and evidence.

410 distinct checks across51 affected files pass:403 dependent checks (69317.002ms, concurrency4), six focused Director cases (1774.4095ms), one new startup opt-in case (625.0987ms). The focused cases cover no present players/valid player message, restart/replay, private fairness, failure without retry, attendance/time not creating opportunities, proxy/closed-scene holds and optional-failure isolation. Real native SQLite/state is used; model and Discord transport are simulated. No actual model or Discord call was made for this slice. Earlier separately logged 27B samples remain development evidence, not certification of this cadence.

Static closure:133 native modules,95 reachable,38 uncomposed,eight legacy imports,zero missing imports and four generic tools. No table/store schema was added. Opportunities/results are closed native record kinds in the existing private proposal journal; retained intentions remain GM-private plan records, outside audience recall.

## Holds, migration, rollback and next work

Only opening/reopening opportunities are implemented. Fictional elapsed-time pressure, world-event opportunities, offscreen factions, player response windows, pending consequence dependencies, context relevance, long-history curation and meaningful NPC action execution remain open. No private proposal is an authorized observable beat or publication. Existing NPC identity/knowledge must already be native and source bound; legacy NPC conversion and legitimate witness/IC-speech issuers remain separate work. Planner attention balancing is not full spotlight fairness.

No data rewrite, legacy retirement, major-phase merge/push or production change occurred. Keep immutable opportunity claims/results and private history on rollback. Disable the opt-in cadence rather than erasing failed claims to force another inference. Older code must not interpret these journal records or plans as facts, delivery acknowledgement or performed actions. The global development call budget includes optional Director calls; performance and default27B thinking-profile quality remain unqualified.

Next R5: authenticated fictional-event/perception sources and pending player response tracking; connect only fully validated generic native actions and licensed observable disclosures. R3 complete readiness/controller, R2 witness/correction semantics, R4 conversational quality and R8 human/cutover gates remain independent prerequisites. Production stays unchanged.
