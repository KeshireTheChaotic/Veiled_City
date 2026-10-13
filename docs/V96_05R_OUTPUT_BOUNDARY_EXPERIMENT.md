# Current status: V96-05R audience-isolated authoring implementation

The owner decision supersedes the earlier stop below. Current code, known limitations and residual semantic risk are in [V96_05R_OUTPUT_CONTRACT.md](V96_05R_OUTPUT_CONTRACT.md); actual qualification is recorded in [V96_PROGRESS.md](V96_PROGRESS.md). The following experiment is historical, not a current status or completion claim.

# Historical V96-05R — unqualified output-boundary implementation experiment

Date: 2026-10-13. Branch: `codex/typed-intent-refinement`.
Starting and ending committed HEAD: `aeffb8e3b5ec2a9bfee18af7081fea0ab49e181d`.
**Status: BLOCKED; working draft only. No phase completion, commit, push or deployment.**

Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native services/receipts own outcomes; narration is an authorized projection, not an effect executor.

The revised owner plan was read in full from the local supplied `Veiled_City_V96_Revised_Implementation_Plan.md`. The initial tree contained that untracked document; it was preserved. The published anchor is now the actual local HEAD, not the earlier V96-04 SHA. Earlier blocker entries describing an uncommitted six-case reproduction at `de0c949` are historical, not descriptions of this checkout.

## Implemented experimentally, not release-qualified

| File | Draft change |
|---|---|
| `bot/src/pvp-output.js` | Prepare ordinary output as native parts rather than returning unrestricted prose; quarantine unknown text; require preparation for publication. Add bounded nonmaterial grammar parts, native GM-private review-scope provenance for a neutral output with no player source, and exact renderer-derived chunk checks. |
| `bot/src/publication-outbox.js` | Require prepared publication proof before queueing, including outside protected PvP. |
| `bot/src/nonmaterial-grammar.js` | A complete-byte decoder for a **finite** set of known nonmaterial renderings. This is not semantic classification or a general solution for harmless prose. Its scope metadata is GM-private. |
| `bot/src/gm-fiction-composition.js` | Closed v2 NPC composition: gestures, open questions, attempted threats and exact previously recorded NPC quotations with matching current NPC knowledge/source/audience. No model-created receipt or PC consequence. |
| `bot/src/gm-world-narrative.js` | Additive v2 schema/reader; reuse current NPC occupancy, availability, proxy, ownership and audience rules. Existing v1 remains. |
| `bot/scripts/v96-05r-fiction-test.mjs` | Three actual commit/outbox/binding regressions; original six SEM06 tests unchanged. |

The new binder records v2 proof with ordered part IDs, reconstructed full-text hash, chunk index/count, turn, ordinal, surface and recipient. It reconstructs Discord chunks from currently verified renderer output both at bind and send. Existing v1 proofs must also match the reconstructed chunk; no missing-proof historical publication is silently certified. This is additive record data, **not a SQL migration**. Compatibility and all read-side paths remain unqualified.

An additional OUT05 defect was reproduced red-first: `bindOutputPublication()` accepted a prepared NPC part but a different supplied payload (`Choso apologizes for losing.`), and overwrote the proof. The new test initially failed `Missing expected exception` (0/1, exit 1); it now passes and verifies the old proof is unchanged on rejection. No fake dice, source, consent or mechanical receipt was used to repair it.

## Actual evidence

All commands below ran from `bot` with `--import ./scripts/offline-guard.mjs`. TEMP filenames identify local verbose logs; no successful logs were copied into general telemetry.

| Run | Actual result | Log |
|---|---|---|
| Unchanged six SEM06 cases before runtime changes | 2 pass / 4 fail / 0 skip; exit 1 | `veiled-v96-05r-baseline.log` |
| New source-specific NPC composition tests before v2 implementation | 1 pass / 1 fail / 0 skip; exit 1 | `veiled-v96-05r-fiction-red.log` |
| New binder wrong-payload test before byte-binding fix | 0 pass / 1 fail / 0 skip; exit 1 | `veiled-v96-05r-binding-red.log` |
| Final core: original SEM06 + new fiction/binder + V96 baseline suites | **13 pass / 0 fail / 0 skip; exit 0** | `veiled-v96-05r-core-final.log` |
| Initial wider check: V95 protected narration + publication + observation suites | **54 pass / 21 fail / 0 skip; exit 1** | `veiled-v96-05r-integration-initial.log` |
| Impacted check after binding/fallback changes: V95 protected narration + observation compatibility + PvP authorship | **110 pass / 1 fail / 0 skip; exit 1** | `veiled-v96-05r-impacted.log` |
| Final isolated unchanged `PVP30ag unrelated` test | **0 pass / 1 fail / 0 skip; exit 1** | `veiled-v96-05r-quality-final.log` |

Exact final focused commands:

```text
node --import ./scripts/offline-guard.mjs --test scripts/v96-semantic-output-p0-test.mjs scripts/v96-05r-fiction-test.mjs scripts/v96-baseline-test.mjs
node --import ./scripts/offline-guard.mjs --test scripts/v95-protected-narrative-test.mjs scripts/v9-observation-compatibility-test.mjs scripts/v9-pvp-authorship-test.mjs
node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30ag unrelated' scripts/v9-pvp-authorship-test.mjs
```

`PVP30ag` is an **existing mandatory positive**, not a new artificial expectation: after moving to an unrelated native scene it expects ordinary `Rain falls on the pavement.` narration not to throw. The strict draft instead throws `NARRATIVE_PVP` at `assertPvpOutput()` through `validateNarrativeClaims()`. The test and its assertion remain unchanged. Appending this sentence to the decoder would hide this finite example, not solve ordinary expressive composition. That patch was **not** made.

The 21 wider publication failures are at the old fixture's direct `queueTurnPublications()` call with an unprepared `Native receipt notice`/long transport string and no real active-scene output proof. They demonstrate an unresolved **fixture/API compatibility migration**, not 21 independently diagnosed new mechanical defects. Their transport, uncertainty, owner and native-disclosure assertions were not deleted or relaxed. The replacement fixture must retain those assertions while supplying a genuinely supported native output. None of these failing runs is qualification.

Earlier isolated, memory-only experiments additionally measured:

- Strictly globalizing the old composer: 8/10 pass, including original unsafe negatives now blocked, but harmless-idiom and actual reflective-work response positives fail.
- Projecting the whole NPC `public_identity` paragraph under an attributed NPC wrapper: the existing active-scene test fails (0/1) and a verified payload contains both `PRIVATE-NPC-SECRET` and `Choso apologizes for losing.`. Scope/attribution/hash alone are insufficient; this unsafe expansion was **not** applied to runtime.

`docs/experiments/v96-05r-boundary-probe.mjs` retains those isolated probes. Its guarded source anchors target the original baseline modules and no longer match the current modified modules; it must not be represented as a runnable current-tree qualification suite or imported into production. The recorded results precede the draft implementation.

## Acceptance inventory — no green phase claim

| Case | Current evidence / unresolved scope |
|---|---|
| OUT01 | **Focused PASS:** all six original SEM06 reproductions unchanged now pass, including the real injected combined GM → preview → commit → outbox cases. |
| OUT02 | **PARTIAL:** original injury/choice cases and fabricated quotation source blocked. Full forged-claim, owner, audience and receipt contrast matrix not qualified. |
| OUT03 | **BLOCKED:** source-specific recorded NPC quotation/threat/question positive passes, as do existing bounded V95 NPC/observation cases; existing unrelated-scene ordinary narration positive fails. Fresh expressive dialogue/conditional atmosphere outside the catalog has no independently certified route. |
| OUT04 | **PARTIAL:** existing V95 independent Billy-arrival test passes in impacted run. Global clearing of generated memory/handout/cognition candidates now also affects ordinary turns and needs separate safe-projection/continuity audit. |
| OUT05 | **PARTIAL:** new quotation restart/send-once and exact-byte binding tests pass. Legacy fixture migration, ordinary private messages, voice, simulation hooks, summaries/journals/recaps, archive and broader revocation/recipient/chunk mutation qualification remain open. Existing voice/publishing conditions still distinguish protected PvP from ordinary output. |
| OUT06 | **NOT QUALIFIED:** existing native arrival/Fear/notice renderers reused, but no complete new ordinary roll/damage/custody/contract receipt projection matrix was run. |

Default registrations were **not removed or skipped**. The new three-case draft suite is not yet added to the mandatory registry; it must be registered with the release guard before any future phase qualification. The registry remains 138, not a claimed 138/138 PASS. No full `npm run validate` was run for this known-red draft, and the 137/137 completed V96-04 result remains historical. Release manifests intentionally have not been synchronized as if this were a qualified release.

Final blocked-checkpoint diagnostics: `npm run check` exit **0** (TEMP `veiled-v96-05r-check.log`); `git diff --check` exit **0**. A separate `git diff --exit-code -- bot/scripts/v96-semantic-output-p0-test.mjs bot/scripts/v9-pvp-authorship-test.mjs` returned **0**, confirming both the six original reproductions and the failing established positive are unchanged. These diagnostics do not waive the behavioral failure. No fresh standalone D08 or complete release qualification is claimed for this draft.

## Architecture decision / stop condition

The strict native-part route closes the original prose bypass, but the experimental expressive lane does **not** meet the combined quality floor. Its fresh language is an enumerated catalog; free words require a previously recorded exact NPC quotation (`observation`, `source_id: human_gm`, matching quote and non-secret knowledge). A normal seeded NPC cannot autonomously produce fresh source-grounded conversation through that route merely because its role, public world facts and current agency are valid. That convention is also not a universal human-authentication proof and must not be broadened to self-certified model source IDs.

The finite grammar was a limited compatibility experiment, not a defensible replacement for normal roleplay. Its need to enumerate exact harmless sentences, plus the unchanged `PVP30ag` failure, is concrete evidence of the current implementation's restriction. **This is not a claim that richer independent composition is mathematically impossible.** It is a failed candidate under the owner's explicit no-severe-narration-restriction condition.

Before proceeding, an owner architecture decision is needed on the authoring boundary for **brand-new NPC words and mundane fiction**, separately from outcome authority:

1. Retain strict source-only output and explicitly scope a substantially richer controlled-language/fiction authoring representation, accepting that novel dialogue outside that representation remains held. This needs public/recipient-specific source and disclosure contracts, not more sentence exceptions.
2. Design a separately audience-restricted NPC/scene authoring stage with explicit limits on what new utterances it can establish, and approve any changed request budget/residual semantic risk. An attributed utterance would still never establish a PC consequence. Neither another semantic screen nor unrestricted paragraph approval is silently authorized by this option.

No probabilistic screen, extra default provider call, arbitrary profile passthrough, weakened assertion or broad exception suppression was adopted. Do not treat all 13 core passes as OUT01–06 completion, add `Rain falls...` to conceal the failure, begin 05S/05E/optimization, or commit this draft.

## Persistence, safety and resume

Only temporary SQLite fixtures were used. Native mechanics/receipt arithmetic, Daggerheart, consent terms and saved campaign data were not changed; the tested fixture resources remained unchanged. In-process injected providers/fake transport/synthesis are not live requests or performance measurements. No production files/databases/credentials, Discord endpoints, paid providers, deployment, merge or push were accessed.

Keep all draft code, tests, diagnostics and the supplied revised plan uncommitted for review. Resume at actual local HEAD plus this dirty tree, not a reset to `de0c949`. Do not remove the six original reproductions or the existing `PVP30ag` positive. After an approved architecture and complete implementation, register the new suite, close every OUT case, migrate transport fixtures without losing their assertions, run impacted gates, synchronize manifests and run one full same-tree T2. Rollback of these drafts does not repair the published original defect; no source/history reset or campaign rollback was performed.
# Current owner decision / implementation follow-up (2026-10-13)

The owner subsequently approved an audience-restricted, source-bound fresh NPC authoring stage, without expanding the fixed catalog or adding PVP30ag phrase exceptions. The experiment above is retained as historical evidence, **not the current implementation status**. See [V96_05R_OUTPUT_CONTRACT.md](V96_05R_OUTPUT_CONTRACT.md) for the conditional isolated writer, explicit residual semantic risk, common sink contract, exact transport-fixture migration and known review-only legacy routes. See [V96_PROGRESS.md](V96_PROGRESS.md) for actual current tests/final qualification. No phase completion is implied by this heading.
