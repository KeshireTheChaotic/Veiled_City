# W4 Opening/assembly integration completion

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Starting branch `codex/audience-first-narrative-v9`, SHA `129a5ec0e7622a996da483d9c52d82d8ea0f0152`. Application0.0.0.1/schema460 remain unchanged. This closes the Opening/assembly workstream against the currently implemented native services, not the remaining UA/catalog, World Director simulation or campaign-PvP executors.

## Confirmed gaps and corrections

- **Initial bridge request:** only a late/check-in `opening_entry_opportunity` could previously request a World Director opportunity. Pre-start attendees and the zero-attendee camera had no equivalent initial request. The immutable authenticated `session_opening_job` now produces a bounded, audience-scoped operational request. The existing planner/writer packet consumes it in the same request; no new provider pass, polling job, world row or simulation actor. Exact native delivery coverage closes a pending owner request; closed jobs retire initial requests even after a truthful fallback, without certifying its prose or generating again. Requests cannot establish presence, disclose character material, grant effects or earn fictional/canon weight.
- **Scoped retrieval before bounds:** `openingWorldOpportunities` scanned the latest100 events across all audiences. Unrelated private traffic could hide a valid current hint. The DB now selects current native Director sources by guild/session/scene/audience/owner before the12-source bound (one extra row detects truncation). The existing source, principal and beat validators still decide eligibility; hints confer no publication or effect authority. Same-audience overflow is explicit, not a claim of complete historical retrieval.
- **Truthful native status:** readiness relied on `assembly_mode=auto`/phase, so even a completed native job still instructed the GM to run a manual assembly ritual. It now reports actual scheduled, in-progress, completed, manual and held states. A revoked operational job is reported as needing source review, not thrown through unrelated read-only status. Actual publication still requires the original current proof.
- **Quarantine reporting:** writer failure already preserved independent exact-source hook delivery. The missing behavior was reporting: persisted job slots/GM reports omitted generated/verified/quarantined distinctions. They now retain those booleans and explicitly report held authoring. A delivered fallback or personal source is never relabeled as verified original prose. GM status remains private and chunked; provider error bodies are not copied into reports.

## Acceptance crosswalk

| Scope | Production boundary and evidence |
| --- | --- |
| O0/O1 attendance | Existing native pre-start registration/carry, actual owner assignment, absence/late/rejoin/proxy checks retained; no travel or party consent from check-in. |
| O2 initial opening | One authenticated durable start job,0/1/N attendees, camera vs character viewpoint, manual/pause/resume and bounded single-flight generation retained. Initial world requests no longer need a second check-in. |
| O3 delivery/recovery | Existing certified output + shared outbox, exact prepared unsent recovery, uncertain-send hold and source-reviewed replacement; no blind retry or reset of acknowledged history. |
| O4 personal entries | Owner-only source hooks, late entry and retained acknowledgements; missing entitled material stays truthful orientation. GM-only hook solutions remain GM-private. |
| O5 integration/diagnostics | Current scoped Director/clock hints, real pre-roll Fear miss and owner-death coexistence, pending-action gates, owner defense/Armor/death, private narrative suppression, restart and no repeated opening/model/dice/cost. |

The existing isolated expressive writer remains available. Tests include a genuinely playable public/private scene, ordinary leads, exact owner hooks and rejected forced cooperation, movement, disclosure and injury. This phase does not replace expression with a sentence catalog or claim universal semantic detection.

## Operations and compatibility

`/vc-session start` still schedules automatically. `present`/`arrive` retain attendance/placement separation. `/vc-session assembly-status` reports actual native status and per-slot generated/verified/quarantined evidence. `/vc-session assemble` remains inspection/recovery for native jobs; legacy sessions retain their existing preparation path.

Stale plan/source changes still require the existing explicit review. Delivered/uncertain parts and previous turn/source proofs are never silently rebound or resent. The one reviewed replacement limit is unchanged. No new commands, command registration, opt-in flags, database migration, version bump or production repair.

Rollback by reverting this package's read-only bridge/status changes. Preserve all opening, source, delivery, native action/cost/HP/death and review history; do not delete imported characters, reset once-keys or replay messages. Existing native publication/receipt engines and historical readers are unchanged.

## Validation boundary

Targeted deterministic temporary-SQLite/fake-provider/fake-Discord tests only, as directed by the owner. The [active ledger](NO_DEFERRALS_LEDGER.md) records red/green commands and actual final counts. No full offline registry, live Discord/provider requests, production database, deployment or live-quality claim. Future unsupported world/PvP feature producers remain their own workstreams and must reuse this source/audience/receipt contract, not obtain an OpeningDirector waiver.

Final directly affected9 scripts: **191/191 passed**,0 failed/cancelled/skipped/todo,67809.3726ms. New integration7/7; registry guard1/1; syntax482 modules/scripts and24 command roots; quality260 modules/326 existing long-line warnings; normalized manifest609/609. Tests exercise real native source, output preparation, SQLite receipt, outbox and command paths with deterministic provider/transport fakes, not just delivery callbacks. Results-only documentation changes do not trigger a redundant gameplay rerun.
