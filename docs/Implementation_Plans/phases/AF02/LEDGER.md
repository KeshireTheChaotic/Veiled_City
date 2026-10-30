# AF02 — Native general-operation layer

**IN PROGRESS — resource/modifier/duration foundation verified, Agent C.** This is not completion of AF02 or AF03–AF07.

Delivered: small closed resource, numeric-modifier and duration plans in `bot/src/frameworks/daggerheart/feature-operation-plans.js`. Existing `feature-costs.js` now uses bounded resource planning and supplies a shared synchronous Fear/NPC Stress writer. The existing `feature-window-rules.js` reaction-cost path calls that writer after its source/actor/choice checks and existing immutable replay receipt gate. Receipt formats, existing state writers and owner-controlled payments remain unchanged. The helper creates no new mutable truth store, model execution route or authority grant.

Modified files: the three production modules above; added fresh `bot/tests/ai-gm-2026-10/af02-operations.test.mjs` and this phase's evidence/report.

## Verification — complete for this foundation

Run `AF02-C-operations-1`: four changed-file `node --check` calls — **exit 0**. From `bot/`, `node --test tests/ai-gm-2026-10/af02-operations.test.mjs` — **5 passed, 0 failed, 0 skipped, exit 0**. Tests cover strict shape/balance handling, optional token caps, closed count/threshold/band/conditional modifiers, committed-event duration matching, additive native costs, rejection of PC/token payment substitution, and real in-memory SQLite rollback of Fear when the second native write fails. Exact baseline and input hashes are in EVIDENCE.json. Completed unchanged tests must not be rerun.

## Pending source ruling

`adversary:aster-vale-forecast-engine:expected-value` prints: “The first time each scene the PC gains advantage, the Engine gains a Forecast token (max 3).” In multiplayer, this leaves two distinct native occurrence scopes: once per Engine/scene total, or once per Engine/PC/scene. The amendment requires design-time owner rulings for ambiguous original printed rules. An owner question has been presented; no trigger scope or token gain has been implemented for this occurrence. Neither the cap of 3 nor another feature's rule resolves this scope by itself.

## Remaining scope / next exact phase

Continue **AF02**: finish source-qualified trigger/token/choice operation integration, current/saved receipt and replay verification, movement/scene and multi-owner workflow coverage. Then **AF03**, migrate the 20 existing occurrences with real receipt parity while preserving the nine exceptional proof gates. The arithmetic foundation and SQLite test alone do not qualify that migration, all-feature execution, runtime AI behavior, provider/Discord delivery or release. No old handlers/readers were removed.
