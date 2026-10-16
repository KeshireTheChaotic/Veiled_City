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

## F6 / AR5 — actual current-runtime retirement

Starting `2bb2d1e930e669134730355225d0ca09e8ba241c`. Tracked source/import scan found **no runtime import** of either old roll/consent language producer. The dynamic D2 test consumer was identified and migrated explicitly, not ignored. Their behavior is retained only as offline compatibility fixtures; original assertions remain executable unchanged.

| Removed runtime symbol/path | Prior consumers | Native replacement / preserved reader | Assertion crosswalk | Disposition |
| --- | --- | --- | --- | --- |
| `src/roll-language.js`: `rollDeclaration`, `routeRollMessage` | I_HEARD_YOU 2/integration; typed routing; legacy migration; D2 parity test only | `roll-declaration-review.js`; `typed-mechanics.js`; exact roll request/collaboration/proof/outcome services | Same conditional/spend, owner, delivery failure, replay and native-export assertions; imports point to `scripts/legacy-fixtures/roll-language.mjs`. AR5 AF19 proves no runtime fixture import. | Removed from production source; unchanged behavior archived as test fixture |
| `src/consent-language.js`: `routeConsentMessage` | I_HEARD_YOU 4/integration and D2 test only; fresh-authoring used native reexports | `consent-native.js` remains the real runtime offer/response service | Same consent term/revision/owner/privacy assertions; native-only tests import native service directly, syntax cases import offline fixture. D2 checks export identity. | Removed from production source; syntax retained as test fixture |
| `gm-mechanical-v9.js`: unused `GM_MECHANICAL_OPERATIONS` | No consumer; definition only | Closed `gm-arbitration-contract.js` taxonomy; native execution dispatch | No assertion removed; forged-role and unsupported-feature negatives retained | Deleted redundant inert export |
| Current legacy five-field candidates | Current structured provider schema restricts versioned exact source candidates; native recovery/read paths and tests still exist | `currentAuthoredCandidatesSchema`, accepted typed source | Existing SEM/native source tests remain | KEEP remaining read/review definitions |
| `continuity-routing.js`, `scene-entry.js`, `player-language.js` | Active source/context/dialogue/manual/flag-off and test consumers | Native services already extracted on parent | Current tests do not prove every remaining wrapper replaceable | KEEP; no blanket module purge |
| v8 request transport/readers and native v4 outcomes | Current v9 authoring wrapper still consumes v8 request transport; old flags/tests and outbox use readers | Writer response is v9, source/audience/act verified; native outcomes remain v4 | F3–F5 actual output, historical schema/hash, flag-off and publication checks retained | KEEP active transport/readers |
| Old referenced plans/audits | `.gitattributes`, operator/reference/source-evidence or historical ledgers | Current docs index points to current plan/ledger/contracts | No unique evidence removed | KEEP six initial referenced candidates; F0 unreferenced plan already deleted |

Focused AR5/D2 equivalence **2/2**, exit 0. Five original compatibility test modules executed **5/5 module wrappers**, exit 0; these are not counts of internal assertions. No assertion weakened or suite dropped. New framework/audience/arbitration suites are mandatory; all previous mandatory registrations and all 39 optional matrices remain. Final full qualification is F7, not this deletion gate. No DB migration or paid calls. Recover retired runtime files from the starting SHA; never restore a stale campaign DB to undo source cleanup.
