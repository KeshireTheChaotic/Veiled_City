# P09-F05 — Pilot: Professional Entry via ordinary advantage: ledger

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** IMPLEMENTED / TARGETED DELTA — source predicate and per-encounter use wired to native roll paths; full executor workflow remains unverified

## Planning baseline

- Intended branch / pinned snapshot: `codex/clean-ai-gm-2026-10` / `81569d08699343e401fc11ba1eaed0f10b4fd37a` (historical plan snapshot).
- Execution SHA at start: `3fcd8ac64b2da533ca1d28822349572e294969e3`; branch `codex/clean-ai-gm-2026-10`; tracked tree clean.
- Changed production modules: **NONE**. Existing source-bound cue stays intact; no mechanical adapter was added.
- Changed test modules: **NONE**. No changed production code; no tests run.
- Source/feature status: current verified Aster Vale Contractor description is available as GM-private context; no supported prepared-position or first-use native authority exists.

## Execution evidence (append only after actual work)

- Inspected authoritative text: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#Aster Vale Contractor.features[0]` says “advantage on the first roll made to breach, restrain, or surprise a prepared position.”
- Inspected native cue: `native-adversary-professional-entry.js` returns context authority explicitly stating “no prepared-position ruling, first-use tracking or Advantage roll modifier is committed.”
- Inspected current mechanics boundary: ordinary modifiers are sourced through `native-roll-modifiers.js` from current native evidence; no `professional_entry` rule/handler, prepared-position predicate, per-position lifecycle or replay-safe first-use record was found in current execution code. A freeform model flag or rollout policy would invent mechanics, so no modifier was wired.
- Run ID / targeted test: **NOT RUN — no production code changed**.
- Syntax/JSON checks and source/test hashes: **N/A — no source/test files changed**.
- Provider/model calls/tokens/spend: `0 / 0 / $0`; cache/call-count/latency change: `0`.
- Rollback: none required; revert this ledger/phase docs commit only.
- Owner decision: **one qualifying roll per encounter**. This resolves the first-use reset boundary only. A follow-up asks whether “prepared position” requires an explicit native encounter-preparation record, may rely on GM-established scene fiction, or should remain held pending a precise predicate.
- Critical blocker: **NONE**.
- Local hold: keep the exact GM-private source cue available, but do not apply Advantage, consume first-use, or claim a prepared position until the owner rule and qualifying evidence contract are exact. Independent F06–F08 work continues.
- Release qualification/authorization: **FALSE / NOT AUTHORIZED**.

## Completion record

The following completion record describes the original P09 closeout before the owner answered the remaining trigger-evidence question. The 2026-10-22 implementation follow-up below supersedes its LOCAL HOLD status.

- F05 audit baseline SHA: `3fcd8ac64b2da533ca1d28822349572e294969e3`.
- No legacy tests, fixtures, golden results, or suite registries were executed or imported.
- Feature is closed as a precise local hold, not mechanically supported; current cue behavior remains available and unchanged.
- The per-encounter reset is now owner-authorized, but no Advantage is implemented until a native prepared-position predicate is established. No narrative/autonomy restriction was proposed.

## Owner decision and implementation follow-up — 2026-10-22

- Owner contract: explicit native encounter-preparation evidence has priority; GM-established scene fiction also qualifies when saved as authoritative scene/encounter evidence before modifier determination. A prepared position is tactical preparation, not mere alert or hostility. If no evidence exists, preserve the passive and continue the independent action. The first qualifying breach, restraint, or surprise roll per encounter consumes the passive. No retroactive favorable preparation. No new restriction on narrative invention or GM autonomy was requested or added.
- Production delta: `gm-arbitration-contract.js` adds closed unified-arbitration v11 prepared-position proposals and decision proposal v4 feature intent; `scene-intent-board.js` supplies GM-only current evidence; `gm-unified-arbitration.js` commits source-bound scene evidence before adjudication and validates exact feature, action and target; `native-professional-entry.js` owns evidence, qualification, per-encounter receipt and historical ancestry; `pc-incoming.js` and `gm-native-rolls.js` revalidate and apply the native d20 modifier and commit first use atomically with the roll.
- The recognized native-record precedence was tested against a source-bound `native_encounter_preparation` record. No producer for that record exists on the inspected current code path; GM-established scene evidence is the available active path. Producer integration is a local unverified item, not a critical blocker.
- Fresh test: final run `p09-f05-20261022-05`, command `node --test tests/ai-gm-2026-10/p09-f05.test.mjs`, exit 0, **4 passed / 0 failed / 0 skipped**. It covers closed schemas, evidence/action/target eligibility, native-record priority, stale-scene ineligibility, one-time Advantage with deterministic native d20 faces, duplicate/wrong-roll receipt rejection, and preservation of the historical roll after source retraction. Earlier test-file changes were rerun only after that associated test code changed; one intermediate fixture failure was repaired before the final pass.
- Changed-file syntax checks: `node --check` passed for all six changed production JS modules and the new feature test. No inherited tests, fixtures, golden results or suite registries were used. No broad validation ran.
- Production source SHA-256: `gm-arbitration-contract.js` `4A54892C530945D5A227B311CFB802D48AD1A1D46A7CCCFB481FF7E0D0BADF1F`; `scene-intent-board.js` `5E22D2403E21107DC81BAFAAB67964F8D62A9752908C3EF1F552532F5F3639DB`; `gm-unified-arbitration.js` `113EA5A9D062ED03FD3B08499C6104866BAFC03DAED89EC6D157E10092D8289E`; `native-professional-entry.js` `F31FC46BE0331B364AD2C97140E9D473A54BDFA53146D3FF64AB25456625C760`; `pc-incoming.js` `C1F64EE41930A768806E14ECDE1024D3E91FF0D65B3D4C7A5904540DED42FC81`; `gm-native-rolls.js` `AE1A9702405AF8263BDF733FC7B5EEEA9E2B1FAD8E2EAFA4898F03EC859CC4E9`.
- Test SHA-256: `p09-f05.test.mjs` `5A0F1533395DF27E018F6F451D220EE3B105075BE1F43807F7BE8F5AE9F1B2A3`.
- Provider/model calls, tokens and spend: **0 / 0 / $0**. Cache changes: **0**. Latency and full live narrative behavior: **UNMEASURED**. No full database-backed Discord/incoming-defense workflow was run; test results are delta evidence, not end-to-end certification.
- Critical blockers: **NONE**. Local unverified work: native-preparation producer integration and complete roll/defense/publication workflow. Push, merge, production, deployment and release authorization remain **FALSE**.
- Feature implementation commit: `66f6764a740856b34accec1684216d5c9c64b7ea`. Rollback this F05 feature commit while retaining the P06 source cue and prior saved readers.

## Instructions for Codex

Record actual inspected source symbols, code changes, test command/run ID and results, source/test hashes, decisions, local holds, and exact rollback as execution proceeds. Keep a clear separation between `SOURCE CONTEXT AVAILABLE`, `MECHANIC QUALIFIED`, and `LIVE END-TO-END VERIFIED`.
