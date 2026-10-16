# Audience-first v9 deprecation and removal ledger

**Initial scaffold.** This ledger must be updated with actual local git status and full per-function equivalence evidence; a candidate is **not** a claim that the file was deleted. Every removed file remains recoverable from Git. Never delete game history, receipts, exact native roll/consent services, or replay/outbox validation because a file looks old.

## First candidate batch: non-runtime docs only

| Existing tracked path | Classification | Required evidence |
| --- | --- | --- |
| `docs/CODEX_VEILED_CITY_SEMANTIC_REPLACEMENT_PLAN.md` | superseded implementation plan | No live links, script readers, qualification assertions; retain S0-S6 ledger/release |
| `docs/CODEX_VEILED_CITY_NARRATIVE_AUTHORITY_IMPLEMENTATION_PLAN.md` | superseded implementation plan | No required source-contract evidence lost; preserve current v8 reader/proof |
| `docs/CODEX_VEILED_CITY_PLAYABLE_NARRATION_REPAIR_PLAN.md` | superseded implementation plan | No active consumer; preserve replay and scene acceptance tests |
| `docs/CODEX_VEILED_CITY_10_2_DELEGATION_QUALITY_PLAN.md` | superseded implementation plan | Preserve delegation execution ledger, release and validation receipts |
| `docs/NARRATIVE_INFERENCE_AUDIT.md` | historical audit candidate | Verify no unique active operator contract or test source |
| `docs/CHARACTER_RESPONSE_GAPS.md` | historical gap candidate | Verify no unique active product requirement or source |
| `docs/I_HEARD_YOU_GAP_ANALYSIS.md` | historical gap candidate | Retain original native/typed-dialogue tests, provenance |

The kickoff checks references to candidate filenames in tracked files. Referenced files are kept pending manual migration. This conservative check is **not** exhaustive proof of no external references, so Codex must review deletion results. The current uploaded `SEMANTIC_LANGUAGE_ROBUSTNESS_GAP.md` and `SEMANTIC_LANGUAGE_LEGACY_DEPRECATION_PLAN.md` were supplied in the conversation, not established as tracked repository files; their N01-N15 and LD0-LD7 requirements are captured in the new implementation plan.

## Runtime candidates — DO NOT REMOVE BEFORE EXTRACTION / EQUIVALENCE

| Function/producer | Native functionality or history to preserve | Current default |
| --- | --- | --- |
| Freeform `roll-language.js` route/parser | Active `reviewRollDeclaration`, exact typed roll, saved roll/request and owner proof | KEEP; extract later |
| Freeform `consent-language.js` and `continuity-routing.js` routing | Native offer/response and discovery proof/delivery | KEEP; extract later |
| Freeform `scene-entry.js` wrapper | Policy, review, current entry, historical saved receipts | KEEP; extract later |
| `player-language.js` lexical current hints | Declaration/source creation and any read/manual fallback | KEEP; replace producer then evaluate |
| Five-field authored-candidate current producer | V1 record reader, pending/legacy recovery and saved hashes | KEEP; turn off producer after v9 proven |
| V1-V8 creative authoring producers | Historical validator and publication/archival readers, supported flag-off modes | KEEP; disassemble by function |
| `scene-observation-route.js` literal optimization | One-call read-only budget and direct/private compatibility | DEFER until equivalent latency and cost proven |
| `typed-mechanics.js`, `typed-roll-proof.js`, roll request/outcome modules | Every exact source, owner, native result, Hope/Fear and cost validation | RETAIN ACTIVE |
| Native v4 outcome rendering and `pvp-output.js`/outbox | Current native projections, hashes, archived/uncertain delivery | RETAIN ACTIVE |
| Current release manifests, validation scripts/evidence | Manifest integrity, 122 baseline mandatory and 39 optional matrices | RETAIN ACTIVE |

Update this ledger after each migration: path/symbol, exact before/after commits, old callers, replacement, saved-format readers, original negative assertions, focused tests, reason retained/deleted and rollback. Unknown consumers = KEEP.

## Actual kickoff results (Codex fills after running script)

- Branch / parent SHA: **not yet created**.
- Removed first-batch files: **not yet determined**.
- Kept referenced files: **not yet determined**.
- Structural tests: local package `9/9`; integrated bot check **not yet run**.
- Full validation / push / merge / deploy: **not performed**.

## Actual F0 reconciliation

Parent: `09ee30f42ed275a1effc6891e052d6b2eaaac803`; new local branch `codex/audience-first-narrative-v9`. Only preexisting untracked work is `docs/rework/`, preserved outside the commit and distribution manifest. Starter SHA is recorded in the execution ledger. No starter script run against the advanced source.

Deleted: `docs/CODEX_VEILED_CITY_SEMANTIC_REPLACEMENT_PLAN.md` — superseded by this plan; tracked filename scan found no consumer outside generated manifests. S0–S6 release/qualification evidence and all assertions retained. Recover from parent Git revision.

Kept: narrative authority and delegation plans (`.gitattributes` references); playable narration plan (live contract reference); inference audit/character gaps (README and source-build evidence); I_HEARD_YOU audit (implementation and source-build references). No consumer migration or evidence deletion in F0. No source module deleted.

Already extracted on the reconciled parent: `roll-declaration-review.js`, `consent-native.js`, `discovery-delivery.js`, `scene-entry-native.js`. Reuse rather than re-extract these native services. Historical compatibility is waived for the future fresh DB by owner amendment, but active/native consumer and mandatory assertion equivalence still gate deletion.
