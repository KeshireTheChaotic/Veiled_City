# Veilkeeper 2.0 rebuild — resume handoff

Prepared 2026-11-02 near the user's usage stop threshold. The limit subsequently reset and the user continued the active goal; latest live reading is five-hour 1% used, weekly 64% used. The goal is active, not paused. This document is a resumption guide, **not phase acceptance or goal completion**. Check the actual goal status and live usage before resuming. The entire R0–R8 objective remains required.

## Binding instructions

- Work only in `D:\Library\Development\Veiled_City_2\rebuild`. Parent workspace is `D:\Library\Development\Veiled_City_2`; `D:\Library\Development\Veiled_City` is deprecated and untouched.
- Branch: `rebuild/veilkeeper2-audience-first`. Frozen audit commit: `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Frozen clone: parent `baseline` directory. Preserve the pinned audit while refreshing upstream comparisons when needed.
- User requires a genuinely new inventive conversational GM, strict native consequences, Daggerheart/house-rule parity and exclusive player control of PCs. Exactly four generic AI capabilities: context_read, action_propose, state_inspect, knowledge_propose. No individual move/roll/damage/canon AI tools, no generic state patches.
- User requests: at **2% remaining on either usage limit**, create a thorough handoff, set the goal paused and stop until explicit resume. Read live limits through `mcp__codex_app__get_usage_limits`; do not infer from token totals. Last observation while preparing this file: five-hour 96% used, weekly 63% used. No reset has been requested or authorized.
- After each **completed major phase**, integrate into the rebuild branch and push to origin. User explicitly corrected the merge target: **never `codex/clean-ai-gm-2026-10`**. Current worktree is already on the rebuild branch; avoid a synthetic self-merge. R0–R2 still have open gates, so no phase push has occurred. This is not production deployment authorization.
- Preserve unrelated edits, including current `README.md`. Do not reset/clean. Stage exact owned paths. New tests live under an ignored directory and require `git add -f` for their exact paths.
- Use fresh tests, never legacy suites/fixtures. Once a suite passes, rerun only if its tested code changes. Report focused checks separately from live/gameplay/release evidence. No subagents are authorized by current instructions.

## Governing files and documentation changes

Read current `AGENTS.md`, `docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md`, and the Audience-First, Creative-First, Agency-Preserving and Weighted Lore specifications now under `docs/`. The copy under `docs/veilkeeper2/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md` is identical at the last comparison. Owner behavior and historical source-linked documents were fully read earlier; retrieve their pinned versions through `git show 1ba6c7e:PATH` or the frozen baseline when needed.

The user explicitly requested committing documentation removals/relocations. Commit `3ca9db9d` contains 3,656 deletions, four specification renames, one added handoff copy and AGENTS changes. Do not restore them incidentally. Their deletion does not prove runtime retirement. Some old documentation links now resolve only in pinned Git history.

## Implemented code and current limits

All new runtime code is under `bot/src/v2`; legacy runtime source/schema/content remain unchanged.

- `kernel.js`: opaque authenticated source handles, four closed capabilities, native rule registry and preparation receipts. Unknown operations fail. **No real rules/effects are registered.** Journal/source handles and action receipts remain in memory.
- `source-authority.js`: native message/session/scene/channel/actor proof; owner/proxy delegation, attendance and recipients; revalidation detects edits/deletions/revisions. Conversation authority is not consent. Reused edited source identities currently fail closed; full edited-message/replay reconciliation is pending.
- `scene-store.js`: separate SQLite native records for messages/channels/scenes/sessions/actor control; closed schemas, CAS revisions, history, atomic snapshots and replay receipts. Native authorization callback is still supplied by caller; persisted permission booleans alone are not live Discord proof.
- `context-authority.js`: metadata-first recursive source closure, body revision/hash checks, audience and actor-known intersection, opaque grants/revalidation; optional reference lookup through kernel.
- `knowledge-store.js` / `knowledge-authority.js`: separate SQLite history, model proposals, native evidence acceptance, corrections/retractions, identity origin, exact delivery evidence and protected human canon review checks. Full native evidence adapters remain pending.
- `recall-planner.js`: fixed native weights, six-fictional-tick decay, causal deduplication, pins and reversible prompt retirement. Uses native injected readers; no truth/canon promotion. Real cause/pin/clock/query adapters remain unfinished.
- `character-packages.js`, `gm-hook-package.js`, `character-package-service.js`: ported four v3.3.3 JSON export schemas and GM-hook import versions 3.3.1–3.3.3; owner/GM/revision boundary; preparation distinct from effect application. Other export formats, raw character/mechanical import and full repository composition remain open.
- `private-hook-store.js`, `relationship-import.js`: separate SQLite private imports, immutable hook/relationship histories, canonical review ledger, explicit conflicts/replacements and receipts. Relationship targets require native resolution; unresolved/canon targets stay holds. Connections do not grant consent, PC choice or reciprocal feelings. Native production target reader is pending.
- `private-planning-repository.js` / `private-planner.js`: current stored hooks, reviewed canon and relationships projected as GM-private; explicit native planning grant, source closure/hash/revision verification and private opaque plan handles. Pending proposals/history are excluded. No private draft can enter audience gateway/queue. Planning selection/authorization, clocks/agendas and safe private-to-observable transitions remain incomplete.
- `model-gateway.js`, `tool-contracts.js`: optional bounded tool loop (six provider calls, four tools/batch, sixteen total calls), call-ID replay checks, usage counters, retained extra retrieval grants through publication inspection. Normal prose takes one call. Still an unverified draft, not publication approval.
- `openai-provider.js`: explicit SDK client/model; Responses API, store:false, bounded timeout/output, retries off, opaque context-bound continuation preserving reasoning items. Tested through installed SDK/fake fetch. No real key/network inference used. Model selection, live quality/latency and operational error recovery remain unqualified.
- `publication-queue.js`, `rehearsal.js`, `index.js`: opt-in offline/no-send composition. Everything remains awaiting review; no durable publication, no audience acknowledgement and no gameplay effects. Ordinary response does not invoke private planning automatically.
- `discord-audience.js` (latest slice): native read-only GuildText effective-permission projection, explicit privileged observers, exact ordinary recipients/writers and fingerprint. Requires a freshly fetched complete native member snapshot. Threads/DMs unqualified. Not yet connected to live ingestion or send-time refresh.

## Phase acceptance status

**R0 partial:** exhaustive static inventory/bindings exist: 1,077 modules, 4,224 exports, 219 command routes, 55 effective tables and 456 literal record kinds. 1,009 dynamic/unfiltered record uses and semantic conversion/removal proof remain holds. Consult inventory/binding/state maps rather than deleting by directory name.

**R1/R2 partial:** substantial offline source/privacy/storage/provider infrastructure above exists. Full native adapters, dependency qualification, all imports/exports, live transport and evidence-linked persistence remain open. No report calls these phases complete.

**R3–R8 outstanding:** deterministic Daggerheart/house rules parity, consent/dice/roll timing/Fear/death, consequential prose review, living-world autonomy/NPC cognition, complete Discord command migration/session/private-scene flows, durable state+receipts+outbox/reconciliation, semantic data migration/restore, runtime retirement, live provider/Discord/gameplay qualification and independent human review are not completed.

No production state was copied, mutated, migrated or deployed. Dedicated test databases are disposable. Existing runtime entrypoint remains available. Rollback today is to keep v2 opt-in code unused; that is not a tested production migration rollback.

## Evidence and commits

Use `git log -1`, `git status --short`, `LEDGER.md` and report-specific manifests as authoritative. Latest completed commit before the permission slice was `079b4e4c`; the subsequent commit containing R1_DISCORD_AUDIENCE_REPORT.md identifies the latest checkpoint (`git log -1 --format=%H -- docs/veilkeeper2/R1_DISCORD_AUDIENCE_REPORT.md`). Commit `c9c7312a` is the concrete provider adapter; `239d04e2` is generic tool calling; `e6fede71` is private-planning isolation. No push/merge has occurred.

Latest focused results:

- Scene store: 6/6; `R1_SCENE_*`.
- Concrete provider + changed gateway boundaries: 28/28; `R1_PROVIDER_*`.
- Private planning storage: 22/22; `R2_PLANNING_STORAGE_*`.
- Relationships/import/canon: 25/25; `R2_RELATIONSHIP_*`.
- Discord audience projection: 5/5; `R1_DISCORD_AUDIENCE_*`.

Every slice has output, execution metadata and SHA-256 manifests. Manifests are historical checkpoints: later source edits legitimately supersede earlier hashes. Failed initial runs for knowledge cleanup, import JSON replay, etc. were preserved and explained in their reports. Do not claim all historical manifests describe today's entire tree, and do not rerun all suites merely to produce a green aggregate.

Node v24.19.0 was used; installed SDK dependencies include openai 6.6.0 and discord.js 14.27.0. Fresh tests run from `bot` with explicit `node --test tests/veilkeeper2/<owned-file>.test.mjs` lists. No legacy npm test/validate gates were run as replacement qualification.

## Ordered next actions

1. Honor paused state until the user resumes. On resume inspect live usage, Git status and latest report commit. Preserve README edits. Verify the latest owned manifests only if needed; don't rerun passed tests unchanged.
2. Complete Discord ingestion: fetch native message/channel/guild/membership evidence, preserve privileged-observer fingerprints, resolve current scene/session/actor from authoritative state, and commit closed scene snapshots with freshness/revision checks. Do not accept model/player JSON as verified transport evidence. Invalidate before inference and again before publication, including permission changes while a call is pending.
3. Qualify private threads/DMs/other supported surfaces using their own Discord membership rules; don't remove them from final scope because current GuildText implementation is easier. Inspect legacy command/channel flows at pinned SHA. Build fresh injected-transport tests plus explicitly separate later live checks.
4. Finish native recall/context readers for actual causes, clock, pins, aliases/relevance, identity/cognition and private planning policy. Connect durable reviewed evidence without converting approval into audience knowledge or NPC omniscience.
5. Consolidate actual R0/R1/R2 acceptance matrix: inventory outstanding public contracts, imports/exports and all data semantics; identify exact unimplemented gates and close them. Only phase-complete work triggers authorized origin publication to the rebuild branch. Never merge into the baseline branch.
6. Implement R3 rules from the pinned parity matrix with fixed native RNG streams, versioned internal handlers behind action_propose/state_inspect, atomic native effects and receipts, pre-roll published stakes, PC-owned rolls, consent and owner choices. Do not turn preparation receipts into successful effects without these validators.
7. Continue R4–R8 as specified: meaningful prose review/repair, autonomous world/NPC cognition, complete Discord commands, durable publication/reconciliation, semantic migration/restore, retirement only after replacement evidence, live quality and independent human review. Production cutover still needs separate authorization.

Keep the objective intact. No usage limit, partial slice or offline green test makes the rebuild complete.
