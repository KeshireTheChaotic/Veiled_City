# AF03 — Existing effect migration and exceptional proof gates

**COMPLETE — all 20 bounded effect occurrences ported and targeted offline parity passed.** Wider cross-boundary/runtime qualification remains AF07 work; this phase does not claim full release qualification.

## Delivered

`native-feature-operations.json` declares the 20 exact source/template/handler identities and their bounded native operation values. `feature-operation-descriptors.js` verifies those identities and selects shared numeric or NPC resource operations. Existing source/actor/trigger/owner validators, transactions, state writers and saved receipt formats remain authoritative.

Consumers changed: attack passives, standard damage, defensive passives/aura, first-Severe defense, Blood Rush windows, Memory Leech recovery, scene events, ordinary arrivals, resident obstacles, upload countdowns, contextual roll odds and VIP admission, all under `bot/src/frameworks/daggerheart/`. Scene/arrival/countdown payments now use the existing shared atomic cost writer. Four scene effects share one descriptor-driven scene rule selection. No generic JSON state patch, new dice authority, PC choice or mechanical narration fallback was introduced.

The nine exceptional proof-gated occurrences are deliberately absent from the generalized descriptor registry. Their existing dedicated source, owner-response, alliance/range, reaction, optional-payment, private clue and witness paths remain. No obsolete handler, wrapper or historical decoder was deleted; AF06 still requires AF05 evidence and a final consumer audit.

## Verification — complete for changed bounded paths

Fresh tests, run from `bot/`, each started once:

| Run | Command suffix after `node --test tests/ai-gm-2026-10/` | Outcome |
| --- | --- | --- |
| AF03-C-shared-effects-1 | `af03-shared-effects.test.mjs` | 8 passed, 0 failed/skipped, exit 0 |
| AF03-C-source-workflows-1 | `af03-source-workflows.test.mjs` | 9 passed, 0 failed/skipped, exit 0 |
| AF03-C-receipt-transitions-1 | `af03-receipt-transitions.test.mjs` | 4 passed, 0 failed/skipped, exit 0 |
| AF03-C-proof-gates-1 | `af03-proof-gates.test.mjs` | 1 passed, 0 failed/skipped, exit 0 |

**22 fresh tests passed.** Changed-file syntax checks passed. Test input hashes and baseline are in EVIDENCE.json. Completed tests were not rerun without a tested production change. The Contingency Stack return value was subsequently moved from its identical literal to the verified descriptor and checked by its fresh receipt-transition test.

All 20 declarations match original printed-rule/template hashes and reject changed identities. Native tests cover exact modifiers/damage/first-use and recovery values, four scene-effect receipts, retained saved Difficulty despite later HP/Exposure changes, nonstacking alliance aura proof, scoped roll modifiers, owner-backed admission, ordinary identity arrival/obstacles, four-step countdown creation, first Severe defense and first Stress/after-damage recovery. Receipt readback, private scope and replay are exercised at their respective source boundaries. Disposable SQLite plus newly authored source fakes were used; no provider, Discord or campaign database was accessed.

## Limits and next exact work

These are native-rule tests with injected source/service boundaries, not whole-application, live-AI or delivery qualification. They do not authorize removal merely because a mock passed. Preserve old proof/receipt consumers until AF05 and AF07 scenario evidence closes those boundaries. Production feature statuses remain unchanged; the 75 original review-only occurrences are not collectively enabled.

Next exact phase: **AF04 — activate or explicitly hold each previously unsupported occurrence using source-specific native operations/proofs**. AF02's remaining movement/area/domain operations continue as shared prerequisites. AF06 deletion remains gated on AF05 runtime evidence and a current consumer audit.
