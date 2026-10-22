# P08 source-to-authority crosswalk

**Inspected baseline:** branch `codex/clean-ai-gm-2026-10`, commit `293091d9e8cd4432c59f12f6e89991b4ed7a5be8` (2026-10-22). This is a static source reconciliation, not runtime or release evidence.

| Boundary | Native source / current behavior | Required P08 contract |
|---|---|---|
| Start and planning | `commands.js` schedules `runSessionOpening`; `session-opening-runner.js` serializes one active attempt and delegates to `assembly-planning.js`; `gm.js::planAssembly` produces a proposal. | Planner output remains GM-private and non-authoritative; refresh/freshness and attempt bounds remain native. |
| Entitled owner material | `assembly-context.js::assemblyHookSources` currently iterates `entry_hooks`, `gm_hooks`, goals, background and other fields into `owner_character_material`. | **Confirmed privacy gap:** `gm_hooks` is explicitly GM-only and must not enter owner-visible material. Use an owner-entitled allowlist; preserve GM hook access only inside authorized GM planning. |
| GM planning inputs | `assemblyInputs` separately provides GM hook records, GM narratives, GM-visible facts/canon to `planAssembly`, while the source references are also attached to the character record. | GM-only context may inspire proposals but cannot be projected to writer/player packets or treated as revelation, PC knowledge, or canon. |
| Plan certification | `certifyAssemblyPlan` binds roster/owner and source refs, fingerprints inputs, and records diagnostics; it currently does not certify a public dramatic brief for the writer. | A future brief must be audience-filtered, versioned, tied to the current plan/input fingerprint and revalidated after asynchronous authoring. |
| Public and private writer packet | `assemblyWriterBrief` gives public/private task guidance and permitted source material, but no convergence purpose. `narrative-authority-context.js` attaches it. `openingEntryProjection` shares `assemblyHookSources` with the same GM-hook classification gap. | Public camera may establish a shared situation, not PC presence. Private entry may use only that owner's entitled material and must not infer arrival/action/response. |
| Writer request and output | `pvp-output.js::assemblyNarrativeCandidate` sends generic `describe_scene` for dedicated v2 plans; `prepareAssemblyOutput` accepts native-verified narrative units and otherwise uses orientation fallback. | **Confirmed dramatic disconnect:** pass certified, filtered intent to the audience-first writer; raw planner prose never bypasses source validation. Preserve fallback truth and native acceptance evidence. |
| Cohort and attendance | `session-opening-attendance.js` validates owner-bound pre-start registrations and carries attendance without inferring movement. `opening-entry.js` requires a current owner opportunity and accepted narrative; it does not invoke ensemble planning. | The initial empty-roster camera is intentional. Later cohort coordination must not infer arrivals; owner-private entry remains separate. Manual mode and existing receipts stay authoritative. |
| Publication and recovery | `assembly-publications.js` uses stable slot keys, native outbox, retained acknowledgements, freshness gates, and holds partial/uncertain legacy states. `opening-entry.js` checks prior delivery ancestry. | Do not republish uncertain/delivered slots, rewrite historical receipts, or let recovery bypass current principal, source, audience, or freshness checks. |
| World continuity | `assembly-context.js` exposes `openingWorldOpportunities`; `opening-world-bridge.js` is a bounded set of existing signals. | **Confirmed limited synthesis:** add scoped NPC/faction motive and continuity through authorized existing sources; do not expose actor-local knowledge publicly. |
| Evidence and performance | `pvp-output.js` `assembly_evidence` v3 reports narrative acceptance/fallback and hook selection, but not dramatic-purpose coverage. Public-first slot ordering exists. | Truthful coverage needs native evidence; latency/call claims require measured offline instrumentation, not estimates. No provider spend is authorized. |

## Compatibility and authority conclusions

- Existing versioned assembly contracts, legacy `delivery_state` readers, saved opening jobs, turn publications and acknowledged fiction remain readable. Any new fields must be additive/versioned; no backfill or rewrite of delivered records.
- Native code owns Daggerheart mechanics, source authority, principal/roster checks, publication identities, receipts and exactly-once transport. Narrative packets are proposals only.
- Each player alone chooses PC action, speech, thought, feeling, dice and resources. Attendance and a camera do not establish arrival, presence, consent or participation.
- Audience filtering must occur before writer invocation and be revalidated after awaits and before delivery. Unknown historical/partial delivery stays held for review.

## Findings and disposition

1. GM hooks in owner sources — confirmed in current source; implement F02.
2. Convergence goal absent from writer brief — confirmed; implement F03.
3. Initial opening and later attendance are distinct paths — confirmed; implement F04 without changing the zero-attendee camera.
4. World bridge is bounded rather than a scoped living-world agenda — confirmed; implement F05.
5. Coverage evidence omits dramatic-purpose coverage and late entry has a truthful accepted-narrative requirement — confirmed; implement F06 while retaining fallback/review semantics.
6. Public-first ordering exists; performance cost is unmeasured — retain and measure in F07.
7. No additional current finding retired by this static pass. Runtime behavior and historical data distribution remain unverified.

## Scope decisions and evidence required

Sequence remains F02 privacy → F03 brief → F04 cohort → F05 world agenda → F06 evidence/fallback → F07 measurement. Each implementation feature owns its fresh tests and ledger. F01 is documentation-only and therefore has no tests. Cost evidence for this offline reconciliation: no model/provider calls, zero provider spend, no cache layer exercised, no latency claim. Rollback is limited to this crosswalk and F01 ledger/scope updates.

## Corrective follow-up reconciliation — 2026-10-22

Actual implementation baseline: `codex/clean-ai-gm-2026-10` at `d52c5ac52f7a993e642af7d11a93101351717ea1`; tracked tree clean. The user-supplied P08 corrective handoff was present as an unrelated untracked file and was left untouched. Changes and claims are recorded in P08 and F02–F07 scope/ledger addenda.

- F02: nested export and deep visibility labels now fail closed in owner sheet projections; GM hooks remain separately available to planner. Corrective SQLite canaries pass.
- F03: raw arbitrary `convergence_goal` no longer reaches public/owner writer briefs. Writer receives a non-factual objective and only existing scope-validated world opportunity cues. This is a projection contract, not a compelled prose form.
- F04: GM assemble invokes the cohort gate after a terminal opening; original camera lookup follows start attempt→turn binding→assembly delivery/outbox acknowledgement instead of current slot recomputation. Revision-bound attempts use SQLite transaction claims, stale unsent replacement history, Director pause checks, and version-1 source readers. Tests cover command reachability and the no-camera fail-closed case only; positive delivery, changed-viewpoint receipt lookup, separate process races, stale in-flight writer refresh and restart remain local holds.
- F05: active native NPC/faction goals and public-scoped world opportunities are added to planner inputs with guild/session/scene scope. Disposable DB test verifies agenda inclusion and no clock/canon/simulation-record writes. False-belief/private-memory/public cue matrix and writer integration remain unqualified.
- F06: cohort status distinguishes transport acknowledgement from unverified dramatic fulfillment; tests cover the truthful status string only, not full outbox transitions.
- F07 final corrective union passed 7/7 fresh tests, 0 skipped; changed JS/MJS syntax checks passed. Zero provider calls/tokens and $0. No caching, Discord delivery, latency or semantic quality claim.

No legacy tests, fixtures, suite registries, broad validation, CI, paid model, staging or production database was used. No native campaign data or receipts were changed. No new creative restriction or pending owner question. Release remains NOT AUTHORIZED / NOT CERTIFIED.
