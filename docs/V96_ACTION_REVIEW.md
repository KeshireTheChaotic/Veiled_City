# V96-03 — scoped unsupported-action review

Starting commit `8b3ab34d559249ad2f35357d58e8cd832d8cd0b6` (completed V96-02), clean tree. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Authority and persistence

`unsupported_action` is a GM-private non-actionable receipt: exact accepted action/source hash/principal/scene/session, immutable original proposal hash, context/rule revision hashes, original resolution, safe alternatives and missing-authority category. It is NOT an action outcome, power, consent or cost. Categories distinguish scene epistemic evidence, rule ambiguity, feature permission, adapter absence, and authorization/clarification; ordinary unfamiliar verbs do not require GM review merely because they are unfamiliar.

`gm-action-review.js` supplies owner-private status through the existing authenticated `/vc-roll window` adapter. Owners see only their current controlled character's bounded safe status; GMs additionally see diagnostic codes/source/ruling references. Native review records are excluded from general civic/lore retrieval. The combined GM context receives only the triggering owner's safe pending-review projection, not foreign private reviews. No new provider call or model approval route.

Owner withdrawal/supersession saves a native private choice event and terminal pointer on the accepted action. Canonical declaration/source remain immutable. Current consent, arbitration, preparation and planning recognize that pointer; a model replay cannot restore execution. No-roll/roll outcomes are never invented to close a review. A replacement must already have its own distinct current owner-authored accepted source, and linking it does not execute it.

Final source-security refinement adds a character-private `owner_action_terminal` range tombstone with native choice/accepted-source ancestry. Changed model offsets and already accepted overlapping aliases cannot restore live permission; committed history is not reversed. Proposal diagnostics hold just withdrawn spans/descendants, preserving independent siblings. Native movement/consent/arbitration/preparation recheck the terminal range. Safe owner inboxes show exact current authored attempts; the GM context omits repeated raw text and uses status/references. Unknown storage/runtime faults propagate; only expected stale authority failures become read-only audit status.

The narrow human-GM retry supports an **originally roll-required mundane standard action whose exact saved rule was missing**. The rule must now exist; private native review event AND `gm_action_review_receipt` bind reviewer, previous checkpoint, proposal, exact current saved-rule content and source/scene. It reuses the original proposal, existing arbitration/request and owner options. It cannot change terms, invent capabilities/adapters, waive privacy/source/scene/evidence, replace a source, approve PC conflict or spend/roll. Historical holds without provable original roll-required classification, no-roll ambiguity and other authority gaps stay reviewed; use a new owner declaration where appropriate, never infer an upgrade. This is an explicit safe compatibility limitation, not an unrestricted GM override.

Dependencies reuse existing native DAG and durable continuation services: held actions do not receive fake failure outcomes; independent native siblings/other owners/NPC dialogue proceed. A recovered roll's actual native success can resume the exact original accessible dependent move. A rejected prerequisite alone never authorizes that move.

## Private commands

Inspect current status (owner or authenticated GM):

```text
/vc-roll window json:{"op":"action-review-inbox"}
```

Use the exact returned `review` and `revision`:

```text
/vc-roll window json:{"op":"action-review-withdraw","review":"<review>","revision":"<revision>"}
/vc-roll window json:{"op":"action-review-replace","review":"<review>","revision":"<revision>","replacement":"<distinct-new-accepted-action>"}
```

A different tactic can always be declared naturally as a fresh owner message. Linking a replacement never changes its goal or chooses/spends anything. For the narrow supported rule-ambiguity case, save the exact real ruling through the existing authenticated rules service, then GM only:

```text
/vc-roll window json:{"op":"action-review-retry","review":"<review>","revision":"<revision>","ruling_key":"<exact-original-missing-key>"}
```

These use the existing registered command; no command registration or live Discord test occurred. Foreign/stale/spoofed/duplicate terminal interactions reject without effects. Source revocation or changed scene/owner retains audit history but invalidates execution; review is not a way to resurrect a retracted declaration.

## Coverage and actual results

| Case | Production path / focused tests | Result |
|---|---|---|
| HOLD01 | Native `state` → ruling → private unsupported receipt/inbox; actual Discord GM saved-rule retry; manual prepare/arbitration bypass rejection; Shadow Tell still held (tests 1,5,6,8) | PASS |
| HOLD02 | Real four-owner fixture: unsupported feature, two completed native siblings, separate Choso native observation, Billy NPC conversation via commit/outbox; neutral withdrawal, distinct source replacement, recovered roll → original native movement (tests 2–4,9) | PASS |
| HOLD03 | Source revocation/restart, changed native scene/ownership, spoofed gm fields, duplicate choices/retry, no-session inbox (tests 3,5,7,10–11) | PASS |
| HOLD03 source aliases | Native propose/accept plus manual prepare; changed offsets and overlapping preaccepted aliases (tests 12–13); mixed-source replay in test 2 | PASS |

Red-first: missing review receipt **0/1**, exit 1 (`0 !== 1`); separate manual preparation bypass **0/1**, exit 1 (Missing expected exception). Original fixture mistakes (`resolution` in closed v2 proposal, wrong simulation helper signature, label-only scene change) were corrected, not claimed as gameplay defects. The recovered movement test passed after fixing its setup; existing continuation behavior was reused rather than rewritten. TEMP `veiled-v96-03-red.log`, `veiled-v96-03-bypass-red.log`; final focused log `veiled-v96-03-focus-final.log`.

Own focused **11/11**; combined V96-01–03 **35/35**, exit 0, no skips. T1 eight guarded suites: continuation 28, lifecycle/rules/compound/consent assertion scripts 1 each, FH40 26, D08 security/observability 1 each: **60/60** runner cases, all exit 0/no skips. Scripts wrapped as one runner case retain their actual internal assertions. Final full T2 pending. No live/billable tokens, production data, push or deployment.

Later exact red-first source contrasts: changed offset and preaccepted alias each **0/1**, exit 1 (Missing expected exception). Both closed with native range tombstones rather than model labels or text matching. Actual final own focus **13/13**, exit 0/no skips. Earlier combined 35/35 is historical; the later combined run was 36/37 solely because its new expected-error regex used “withdraw” instead of the actual “withdrew”; corrected without changing the rejection assertion. A final impacted movement test exposed silent filtering of conditional scene actions; restored native rejection for non-immediate framing and reran the unchanged original test successfully. Original mandatory assertions were not edited. Full attempt interrupted at **101/136 passed**, 35 not-run, report still running, wrapper exit 1; no failed child at cancellation, no validator process remained. This is NOT qualification. TEMP `veiled-v96-03-interrupted-validation.json`, `veiled-v96-03-offset-red.log`, `veiled-v96-03-alias-red.log`. Actual executable/test changes require the forthcoming fresh full gate.

## Rollback / limitations

Final source-boundary T1: continuation **28/28**, lifecycle/rules/compound/H01/movement assertion scripts **1/1** each, D08 security/observability **1/1** each: **35/35** runner cases, exit 0/no skips on final source. These reruns are justified by the reopened source/native boundary, not repeated unchanged qualification. Original earlier T1 results remain historical. Fresh full T2 pending.

Final T2 PASS: sync 10.0.0 **589** files; `npm run check` exit **0**; `npm run validate` exit **0**, **136/136** mandatory suites, **0 failed / 0 not-run**, **377,614 ms**. Both D08, original FH40/PVP30q/OBS21/native mechanics/privacy/continuation and assertion/acceptance gates all passed on the same final executable inputs. Actual new review suite **13/13**, no skips. Network denied, live requests 0, billable tokens 0. TEMP `veiled-v96-03-validate-final.log` and `veiled-v96-03-validation.json`. Result-only final annotation/resync/integrity precedes the independent commit; no duplicate full run. HOLD01–03 qualified; V96-04 remains next, not yet implemented.

Additive city-record fields only; no SQL migration, historical outcome mutation or feature/rules arithmetic change. Native review receipts do not enter campaign knowledge. Keep the terminal-pointer/native preparation guards when downgrading code, or disable discretionary execution and hold new review-era actions for manual source inspection; do not run an older executor that ignores withdrawals. Preserve all receipts/imported characters/resources. Unknown reviews remain non-actionable; never restore DB over committed outcomes, reroll or blindly resend uncertain publications. No claim of live semantic quality is made. V96-04 must wait for this phase's full gate and independent commit.
