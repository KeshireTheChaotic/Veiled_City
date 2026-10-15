# Semantic language robustness — 10.2.0

Branch: `codex/semantic-language-robustness`. Foundation: `87b2817b0ed017c3e1472ff406a4a3c99aa4543f`. See [execution ledger](SEMANTIC_LANGUAGE_ROBUSTNESS_LEDGER.md) for independently reviewable phase commits and actual qualification. This is a code repair, not a new ruleset or schema migration; application 10.2.0/schema 460 and dependencies are unchanged.

Qualified S6 implementation: `22f5c985e4f6155f17cffed0d2877f2b849468ea`; subsequent receipt is documentation/manifest only. Final offline122/122 suites and26/26 acceptance entries pass; all39 optional matrices retained. See the final user handoff and GitHub Actions for actual push/CI status, not an assumed deployment.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Changes and interfaces

- Existing `shouldRespond` request returns closed response-only engagement metadata in the same router call. An optional callback carries a request-local native binding into `runTurn`; plain JSON cannot forge that binding. Current source, owner revision, scene and audience are rechecked. Older provider doubles without the added fields retain the combined path. Optional literal fast admission remains a compatibility optimization, not the only way to answer paraphrases.
- The ordinary writer and observation projector arbitrate a duplicate **empty visible current-location description** only after independent native validation. Separate PC/NPC queries, distinct clauses, remote negatives and established observation facts remain. A saved arbitration diagnostic is GM-only.
- Adjacent arrival and same-place exterior-to-interior use existing native movement. The writer receives the staged destination zone; a held writer preserves legal arrival and records missing destination coverage, not false completion. No movement or access authority was added.
- Optional authored candidates have an additive v2 exact-offset/framing contract and require the actual matching current typed input before pending immediate interpretation. V2 does not run competing legacy effect/dialogue staging. Five-field historical candidates remain supported conservatively.
- Typed speech uses current accepted actor/source/utterance plus native audible presence, scoped target, availability and non-proxy checks. Role/pronoun references do not require display-name equality, but two plausible listeners remain ambiguous. Speech memory is verbatim, replay-safe and not a truth/consent receipt.
- Active narrative delegation and Director pacing consume existing semantic engagement and typed context instead of lexical response vocabulary. Unknown pacing is advisory, not an autonomous effect. Request-local hints do not become a cross-turn classifier cache.
- Source-proven, attributed NPC agreement allegations and menu offers no longer imply an actual PC commitment or selected option. Raw/unprepared prose, protected PC reactions and material effects retain their authority gates. Retrospective PC action tripwires remain conservative; a native-known personal vocative permits only the address and retains the original following second-person agency checks.

## Retained exact boundaries

Authenticated owner/principal; immutable original offsets and utterances; native command syntax; NPC hearing and privacy; human proxy control; current scene, zone, adjacency, locks and encounters; negotiated consent; exact pending-roll selection and native dice/cost receipts; canon/evidence/secret isolation; publication fingerprint and deferred source/audience revalidation; uncertain-send reconciliation. No model label certifies an effect or its own prose safety. Literal attribution/quote, contextual-entry, material-consequence, uncertainty and non-NPC forced-choice tripwires remain where no equally strong replacement exists.

The previous entity-reuse/per-unit salvage/audience/NPC-knowledge/diagnostic-savepoint hotfix is retained. No synthetic turn is applied to a production campaign.

## Calls and measurement limits

No new provider round-trip. Direct combined planner+writer remains 2; routed mixed router+planner+writer remains 3. Pure routed semantic scene observation can use router+writer (2, instead of the former combined 3 for an unmatched paraphrase), subject to existing fast-path configuration and native viewpoint checks. The existing direct literal observation fast path remains 1. Private/direct turns do not gain a router. No second writer or semantic safety-judge request is introduced.

All automated measurements are fake-provider/disposable-SQLite/fake-transport results. They do not establish production latency, real token savings, model accuracy or live prose quality. Generated language and semantic classifications retain residual interpretation risk; this is not universal English consequence detection. Conservative holds remain possible.

The historical 12:10 arrival-only cause is **unproven** without that turn's detailed authoring evidence. Both successful arrival variants already passed the initial synthetic baseline; diagnostic coverage was improved rather than inventing a movement defect.

## Operations and rollback

No deployment, bot start/restart, Discord registration/message, production database operation, secret inspection, flag/delegation/configuration change or automated billable provider call is performed by this task. Current production running/flag state is not inferred from historical evidence. Pushing a branch is not an installation.

Rollback is code-only to `87b2817b0ed017c3e1472ff406a4a3c99aa4543f` through the normal reviewed deployment/revert workflow; preserve all campaign state, native receipts, outbox and private histories. Do not replay committed turns or blindly resend uncertain deliveries. New read-side diagnostics may remain as history; no destructive schema downgrade is needed. A future authorized Windows installation still requires fresh WAL-aware backup, integrity/FK verification and disposable restore, exact revision/hash verification and the established runbook. Do not automatically start Veilkeeper or enable flags.
