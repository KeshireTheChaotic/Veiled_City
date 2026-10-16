# Character-specific assembly repair and shared-file integration

## Scope and inspected versions

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Investigation started on `codex/audience-first-narrative-v9` at `eaedeff9e345de859e78276058ac18987ab18f4d`, equal to its fetched origin. The actual production checkout was `05268297e2ef9f472ae794e46afa9282d212ba7b`, on the same branch, with no local changes. Both application packages reported `0.0.0.1`. The assembly files had no committed differences between those two SHAs. This verifies checkout source, not the SHA loaded into an already-running Node process.

After the owner paused assembly work for the other writer, local HEAD became `d203598` (following `f05abedd90bff6114141e83e0bdc2d8f126361a3`). Its committed arbitration changes are integrated in ancestry; assembly/import hunks remain layered on top. No reset, competing checkout, cherry-pick or merge-to-main was needed. The final repair commit is recorded in the task handoff.

Runtime entry: `bot/src/index.js` interaction handler calls `handleCommand()` in `commands.js`. Its grouped `/vc session assemble` and legacy `/vc-session assemble` adapters reach the same GM-authorized assembly branch. No registration change is required.

## Production evidence, without secret prose

A consistent SQLite backup was taken through a read-only, query-only source connection. Only the new backup was journal-normalized and inspected. Backup:

`C:/Users/Keshi/AppData/Local/VeiledCity/maintenance-backups/assembly-hook-audit-b2fd8074-3c66-4960-b8e4-92a91606a93c.sqlite`

SHA-256: `3ae903bf3c5e4abe59b803ad75d013608b5618dcbf7695e403278bd9b613085b`; `quick_check=ok`.

- All six imported owned PCs have player and GM-private narrative documents and active imported GM hook proposals.
- Session 1's actual roster/primary assignments contain Tyrell Williams and Billy Corgie, with matching owners and present attendance.
- Tyrell has 7 active non-canon imported GM hooks; Billy has 6. Their player narratives are 6,342 and 5,173 characters; GM-private narratives are 4,725 and 4,866 characters. No secret contents are copied into this report or fixtures.
- Saved public proposal: 497 characters. Private proposals: 381 and 383 characters. `public_parts=[]`; both `private_parts=[]`.
- Three `assembly_delivery` jobs and three matching outbox publications are acknowledged delivered, at 19:28:34–35 UTC on 2026-10-16. Both private bodies contain the native orientation, not their freeform hook. Three assembly-candidate quarantines exist.
- `city_calendar` has **zero rows**, so effective narrative feature flags are `{}`. The flag-gated expressive assembly writer was not eligible.
- No campaign-row repair was warranted: missing character data is not the cause of these three fallback deliveries. No production rows, credentials, configuration or deployment were changed; no live Discord or paid provider calls were made.

## Root-cause matrix

| Finding | Evidence / enforcement boundary | Classification |
| --- | --- | --- |
| Valid plan need not contain usable hook output | `GMService.planAssembly()` retrieves hooks/narratives, but the old response contract allowed empty publication-parts arrays and no per-PC source selection. A plan could pass without a deliverable personal thread. | Confirmed in source and Session 1 |
| Raw plan and publication authority disagree | `assemblyNarrativeCandidate()` passed freeform proposals to `prepareAuthorizedTurnOutput()`, which correctly quarantined them. `prepareAssemblyOutput()` then rendered native orientation when no independently verified parts survived. | Confirmed; not a reason to disable the guard |
| Expressive stage never ran | `deliverVerifiedAssembly()` required enabled playable-narration flags; production had no calendar configuration. | Confirmed production trigger |
| Delivery count conflated transport with substance | `assemblyDeliverySummary()`, readiness and the command reported acknowledged delivery without a selected/verified-hook or fallback classification. | Confirmed reporting gap |
| Export cannot reliably reimport GM proposals | `buildGmHooksExport()` emits `export_meta`, `imported_gm_hooks`, `gm_hooks` and `entry_hooks`; old import consumed only `hooks`/`canon_suggestions`, and command name/schema lookup used only the import shape. | Confirmed code defect; not this production run's missing-data cause |
| Saved plan had no input revision | Old `assemble` reused any nonempty saved plan, independent of roster, assignment, hooks, narratives or continuity changes. | Confirmed code defect; not proven to have caused Session 1 |
| Refresh could duplicate planning work | New review adapter initially allowed two concurrent clicks to enter planning; deterministic red-first test reproduced two requests. | Confirmed during repair; fixed by durable reservation |
| Canon was absent from freshness identity | A native canon change initially left an undelivered new plan current. | Confirmed during repair; fixed |

## Pipeline and corrected interfaces

Current source anchors: `commands.js:925` (`assemble`); `gm.js:1164` (`planAssembly`), `gm.js:1032` (`authorAssemblyScene`); `pvp-output.js:256` (`assemblyNarrativeCandidate`), `pvp-output.js:273` (`prepareAssemblyOutput`); `assembly-state.js:32` (`assemblyDeliverySummary`), `assembly-state.js:44` (`assemblyOrientation`); `character-export.js:52` (`buildGmHooksExport`), `db.js:2219` (`importCharacterGmHooks`); `assembly-context.js:44` (`certifyAssemblyPlan`), `assembly-planning.js:37` (`refreshAssemblyPlan`), `narrative-authority-context.js:19` (`buildNarrativeContext`). All are under `bot/src/`.

| Stage | Inputs, storage, outputs and handling |
| --- | --- |
| Character create/import | `VeiledDB.createCharacter/importCharacter` stores standard player-authored narrative fields in `characters.character_json`. No character mechanics or saved sheets are rewritten by this repair. |
| GM proposal import | Command and DB use `normalizeGmHookImport()`. Recognized legacy/export shapes normalize into structured records; malformed/empty recognized imports fail explicitly. `importCharacterGmHooks()` is transactional, retains payload/target data and resolved/discarded history. GM proposals remain GM-private; canon suggestions still need the existing review workflow. |
| Markdown | Existing `character-narrative.js` and `character_narratives` retain separate player/GM-private scopes. Planning can consult both; only player-entitled material enters a private writer packet. |
| Check-in/assignment | Existing roster, owner, principal revision, control and attendance checks remain authoritative. Check-in never establishes fictional arrival or co-location. |
| Source retrieval | `assemblyHookSources()` supplies exact, hashed per-character sheet/narrative source IDs. The catalog is bounded to 24 excerpts, each at most 1,800 characters; oversized/unsupported material does not acquire authority by truncation. GM-only premises are never silently reclassified as player knowledge. |
| Planning | The existing single GM-private convergence-planner request receives the actual source catalog alongside imported proposals and narratives. New responses specify exact character IDs and one/two permitted source IDs when available. `certifyAssemblyPlan()` enforces one entry per attended PC, recipient/owner mapping and current source revision. A changed input during generation rejects the result. |
| Persistence/freshness | `assembly_contract.version=2` fingerprints roster, principals, locations/presence, permitted sources, imported GM proposals, narrative revisions, bounded current facts, current canon and party state. No SQL migration. Old plans remain explicitly `legacy_untracked`. |
| Private hook projection | Native `assembly_hook` output quotes the selected owner-entitled thread as character material, explicitly not a newly resolved event, and leaves response/participation open. Its source/plan/owner/principal/scene proof uses the common output-part machinery. No arbitrary model paragraph is certified by source attribution alone. |
| Expressive fiction | The existing isolated narrative writer receives `assembly_brief`, native audience/task proof and current permissible context. Private packets contain only that owner's selected thread; the public camera packet contains no private motives or raw planner cues. Independently verified acts pass through the existing v9 narrative-unit validators and publication machinery. |
| Dedicated assembly eligibility | A current version-2 plan plus a genuinely native, ledger-authenticated assembly request permits this command-owned creative stage even when general narrative flags are absent. It does not enable ordinary-turn narration globally, authorize PC effects, or enable autonomous NPC/location creation. Existing world-authoring/encounter policies still govern new identities. |
| Outbox/delivery | `queueTurnPublications`, actual payload hash/recipient bindings, `deliverQueuedTurn` and `deliverTurnOutbox` remain the transport. Every deferred part rebuilds source/owner/plan/scene proof. Known-unsent parts may retry; unknown/interrupted sends remain uncertain, never blindly reposted. |
| Reporting | Jobs retain selected refs/revision, generated/verified/quarantined stages, raw-proposal hold, fallback and acknowledged-history status. `SOURCE_HOOK_DELIVERED`, `VERIFIED_SCENE_DELIVERED`, `FALLBACK_DELIVERED`, pending/blocked/uncertain and legacy acknowledged status are distinct. The arbitrary original planner paragraph remains undelivered, not misleadingly relabeled as certified. |
| Quarantine/recovery | Rejected creative units stay GM-private. Independent valid source hooks/actions continue. Bounded attempts are saved; restart does not replay model work, dice, spending or native effects. |

### Structured fields

- `private_hook`: GM-private prose proposal, not publication authority.
- `hook_source_refs`: exact owner-entitled source selection; cannot reference another character or a GM-only document.
- `private_parts` / `public_parts`: independently verified native/world output proposals, not raw prose waivers.
- `public_cue`: GM planning proposal only; no implied PC arrival, action or disclosure.
- `stay_reason` / `bonds`: optional GM planning ideas, not commitments, consent or relationships established for a PC.
- `convergence_goal` / `gm_notes`: GM-only planning, never copied wholesale into public narration.

## Shared-file audit after the other writer's integration

`git diff eaedeff..d203598 -- commands.js db.js` isolates the other writer's changes. `git diff d203598 -- commands.js db.js` contains only the surviving assembly/import changes; there are no conflict markers or arbitration reversions.

- **commands.js:** retained `publishGmArbitrationNotice`, owner-only reaction review/roll/withdraw/choice, and the private post-response publisher. Native services validate exact authenticated source/revision before publication. The assembly refresh button has a distinct namespace and GM/issuing-user binding; it does not shadow player reaction adapters.
- **db.js:** retained `gm_arbitration_publication` in held-notice recovery and native operational counts. Assembly adds only its normalization import and transactional GM-hook ingestion. Native notice reservations, owner checks, terminal effects and receipt records are not reset or replaced.
- Shared-file anchors: `commands.js:588` (native private publisher), `db.js:1279` (`heldNativeNotices`); their preceding owner-authenticated roll/choice branches and native operational-count registration remain byte-equivalent to the other writer's committed changes.
- Native group completion/publication continues to use the other writer's native services. Failure after an interaction reply cannot replay a mechanical result; reservations survive for the existing recovery worker.
- No defect or incompatible interface was confirmed in those arbitration hunks. Targeted combined-tree results below qualify only the selected cases, not full UA12/UA17 or release/live readiness.

## Synthetic before/after

These examples use sanitized fixtures, not production secret narratives.

Before: both PCs receive only “Checked-in character … Saved position … What would you like to notice, ask, or do?” despite nonempty private proposals.

After:

- Billy receives his exact personal thread about an **unpaid telemetry invoice**, plus verified ordinary fiction about a maintenance listing/contact number.
- Tyrell receives his own **impossible-route bus card** thread, plus a route-change inquiry opening. Neither receives the other's thread or GM-secret markers.
- The table gets a playable camera scene: a rain-streaked concourse noticeboard with maintenance listings, route-change notices and an open service window. It does not claim the PCs moved there or chose to cooperate.
- “Billy accepts the job and moves inside,” “Tyrell reveals the hidden card to Billy,” and “You surrender and agree to cooperate” are held. Valid personal thread projections still deliver. Resources and character state remain unchanged.

## Regression coverage / validation ledger

`assembly-hooks-test.mjs` exercises production command handlers, SQLite, source preparation, common publication proofs, actual outbox rows and synthetic Discord transports, not only mocked delivery callbacks. Coverage includes:

1. Two unrelated PCs, distinct GM proposals and distinct permitted personal threads.
2. Exact per-PC source-based openings and expressive public/private authoring.
3. Sheet-only character with no GM import; player-Markdown-only source.
4. GM-private Markdown used for GM planning but withheld from player packets.
5. Export/import round-trip including structured payload, targets and resolved status.
6. Explicit missing-source/fallback diagnostic; empty/malformed import rejection and rollback.
7. Cross-player/private-to-public source rejection and isolated writer packets.
8. Forced movement, cooperation and disclosure quarantine without native effects.
9. Accurate fallback/quarantine versus substantive delivery status.
10. Acknowledged output not resent after restart or unchanged-source replacement.
11. Changed hooks invalidate undelivered plans and trigger current-source regeneration.
12. Changed roster cannot retain old recipients.
13. Existing assembly interruption/known-unsent/uncertain/concurrency tests retained.
14. Common ordinary/PvP output guards, real deferred proof/recipient/body checks.
15. Useful public camera context without private motivation or inferred co-location.
16. Source/narrative/owner/recipient/scene/payload/retraction/plan changes after restart.
17. GM-only refresh preparation, immutable delivery history, duplicate clicks and zero sends during planning.
18. Forged assembly-shaped model source rejected; native ledger issuer required.
19. Canon changes invalidate plans; concurrent refresh reserves one planner request.

Actual evidence before final integration:

- Initial baseline `npm run validate`: stopped at preexisting `quality-check` extreme line length in `gm-unified-arbitration.js`; **0 passed / 1 failed / 125 not run**. This is not a passing baseline. Its formatting was corrected without relaxing the guard and is now in the other writer's integrated commit.
- Initial five new behavioral reproductions: **0/5 passed**, exit 1 after correcting a missing fake Discord username. Production defects, not just missing helper methods, were asserted.
- Affected assembly/audience/ordinary-output/outbox integration run: **103/103**, exit 0.
- Subsequent selected security/arbitration run: **272/272**, exit 0. This historical run predates the final canon/refresh additions and is not claimed as final-tree qualification.
- Pre-pause selected final run: **141/142**, exit 1. The failing forged-source fixture omitted a required native event title and never reached its assertion. Adding that title, without changing the security expectation, produced **1/1**, exit 0.
- Final-gap red-first run: canon freshness and concurrent refresh **0/2**, exit 1; after native fixes, those plus the forged-source contrast **3/3**, exit 0.

Final combined-tree results, from local HEAD `d203598` plus the preserved assembly repair:

| Actual command (from `bot`) | Result |
| --- | --- |
| `node --import ./scripts/offline-guard.mjs --test scripts/assembly-hooks-test.mjs scripts/assembly-authority-test.mjs scripts/v96-semantic-output-p0-test.mjs scripts/d08-window-security-test.mjs scripts/v9-pvp-authorship-test.mjs scripts/v96-fresh-authoring-test.mjs` | **144/144 passed**, exit 0; zero failed/cancelled/skipped/todo; `.reports/assembly-qualified-targeted.log` |
| `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='UA12\|UA9 AFG11\|AR3 AF08' scripts/gm-unified-arbitration-test.mjs` | **9/9 selected cases passed**, exit 0; zero failed/cancelled/skipped/todo; `.reports/assembly-other-writer-audit.log` |
| `node scripts/sync-release.mjs 0.0.0.1` | Exit 0, 754 distribution files before this results-only update; version unchanged; owner `docs/rework/` remains outside the release payload |
| `npm.cmd run check` | Exit 0; JavaScript syntax OK for **424 modules/scripts**; Discord command schema OK for **24 root commands**; `.reports/assembly-final-check.log` |
| `node scripts/quality-check.mjs`; `node scripts/format-check.mjs` | Exit 0 each; **234 source modules** / **424 modules/scripts**; no weakened quality guard |

The final test inputs/executable source are unchanged by this results-only ledger update. Normalized-byte manifest integrity and diff-check are finalized before the local commit. Tests use temporary SQLite and network-denied fixtures; no live Discord or paid-model calls. The owner explicitly requested **targeted validation only**; no subsequent full validator or whole-release qualification is claimed. Owner-supplied untracked `docs/rework/` inputs are preserved outside the assembly commit and distribution manifest.

## Deployment and existing Session 1 recovery

This task does not deploy or restart Veilkeeper. Before any separately authorized deployment, retain a consistent campaign backup and use a reviewed development commit; never overwrite `.env`, SQLite/WAL/SHM or owner campaign files. No slash-command registration, dependency install or schema migration is required for this repair.

After separately authorized deployment/restart:

1. Run `/vc-session assembly-status` or `/vc session assembly-status` as GM. Existing acknowledgements should remain visible; old fallback plans are `legacy_untracked`, not retrospectively called source-verified.
2. Run `assemble`. Previously acknowledged orientations are not blindly resent. With no uncertain legacy/native sends, the GM-only **Prepare NEW sourced openings (no send)** control is offered for legacy/fallback or stale plans.
3. Click it only when intentionally preparing new supplemental hooks. It is bound to its original GM, current input/delivery revision and session. Preparation saves the old plan/history, sends nothing, and reserves one planning attempt. Interruption/failure requires a fresh explicit GM review, never an automatic duplicate call.
4. Run `assemble` again. New valid openings use current source proofs. Identical acknowledged personal threads are retained rather than repeated; an unchanged fallback is not sent again. A verified new shared scene supplements, rather than repeats, the old public orientation.
5. If any send is uncertain, inspect Discord and use the existing exact-part reconciliation workflow. Refresh cannot waive uncertainty, reset acknowledgements or declare an unknown send unsent.

No production SQL cleanup, reseeding, session deletion or character/resource reset is necessary.

## Limitations / rollback

- The expressive route reuses the existing isolated writer: at most one bounded request per newly authored audience, in addition to the GM-private planner. For two PCs that can mean one planning request plus three scoped writer requests; already-acknowledged jobs do not repeat them. No live cost/latency or model-quality improvement was measured.
- Newly generated prose retains residual semantic risk. Audience isolation, native typed-unit validation and ownership/source tripwires are not a proof of universal English understanding. The exact native source projection has stronger evidence than unrestricted prose. No global safety waiver, growing sentence exception catalog, fabricated receipt or PC-effect adapter was introduced.
- GM-private hooks/Markdown are planning proposals, not automatically disclosed truths. If only hidden material exists, the report says no entitled personal source; a verified scene or truthful fallback may deliver, not the hidden answer. The GM must supply appropriate player-safe material through existing imports when disclosure is intended.
- Catalog/fact/canon/history queries are bounded. Unknown custom sheet fields and arbitrary setting-file changes are not automatically given gameplay authority or fully fingerprinted. Existing output validators still revalidate their own native references. No universal import-schema conversion or setting rewrite is claimed.
- Actual running-process SHA, real provider behavior, Discord permissions/latency and end-user experience remain live-unqualified. Production evidence is the backed-up snapshot, not an assertion that an old running process loaded new source.
- Roll back code only, retaining all new source/output/review/history/outbox/audit records. Never restore an old DB over legitimate campaign outcomes, delete acknowledgements, reverse native resources or resend uncertain messages. Old code cannot safely publish raw legacy planner paragraphs either.
