# Session 2 / v7 delta regression cases — proposed tests, NOT run

A deliberately **new** regression catalog, extending rather than claiming to reproduce the prior v7 plan's 35 cases verbatim. Keep all cases deterministic with mock provider and native DB/transaction services. Preserve character/recipient privacy. Each test has a case ID for implementation reports.

| Case | Phase | Test input / setup | Required outcome |
|---|---|---|---|
| S2-01 | D00,H05 | 4-PC `/vc-session assemble` with long status / long private hooks | Every Discord message ≤2000 chars, no duplicate scene or private leak |
| S2-02 | H05 | `/vc-session end` long recap | Initial response and follow-ups valid; no truncation of authoritative recap |
| S2-03 | H05 | Private channel unavailable; DM fallback >2000 chars | Chunked private-only delivery; accurate retry state |
| S2-04 | H05 | Delivery fails after first of 3 chunks | Resync sends only remaining parts; no repeated mechanics |
| S2-05 | H01 | `I walk over to Choso and kick him in the shin` | 2 source-grounded occurrences/action clauses; approach separable; kick cannot auto-damage PC |
| S2-06 | H01 | Model invents second `source_span` absent from input | That proposal rejected; valid first clause persists when independent |
| S2-07 | H01 | Model trims apostrophe or changes exact quotes | No acceptance until exact occurrence match; bounded recoverable diagnostic |
| S2-08 | H01 | Same exact phrase written twice in one input | 2 stable distinct start/end occurrence IDs; no duplicate receipt |
| S2-09 | H01 | Two overlapping proposed clauses | Overlap cannot double-execute; legitimate independent subclause is separately reviewable |
| S2-10 | H01 | Native route consumed 1 of 3 clauses | Consumed clause cannot be reinterpreted as new action |
| S2-11 | H01 | One user states `Choso walks over to Tyrell` (Choso belongs to other human) | No Choso movement/mutation; owner authority unchanged |
| S2-12 | H01,H02 | User rewrites own action as `Jaxon walks` then `I walk` | Only current authenticated user/character may be authorized |
| S2-13 | H02 | Jaxon is authoritatively outside; enters accessible front door | Interior arrival/presence native receipt once, no repeated clarification |
| S2-14 | H02 | Jaxon from outside says only `I walk over to Tyrell` | Ask precise entry question when needed; do not teleport |
| S2-15 | H02 | Short `Yes` after open owner-specific entry question | Resolve that exact pending question/target if still current; unrelated `Yes` not a move |
| S2-16 | H02 | `I walk into the store using the window` | Distinguish window route/access and true risk; do not silently convert to unlocked front door |
| S2-17 | H02 | User references `the store` with two plausible storefronts | Ask a single targeted disambiguation without full-turn failure |
| S2-18 | H02 | User explicitly names laundromat interior after earlier exterior | Do not equate exterior receipt with interior entry; recheck current actor location |
| S2-19 | H02 | Location key known but closed/warded door | Grounding alone cannot grant unauthorized access; preserve native obstacle |
| S2-20 | H02,D07 | Narrated NPC at storefront but no presence/arrival receipt | No false co-location, perception or NPC speech attribution |
| S2-21 | H03 | Model says `references=changed`, no matching events | Deterministic no_change review with private normalization record; no fake update |
| S2-22 | H03 | Model says `references=no_change` with verified `npc_update` | Report native truth; mismatched draft review cannot suppress update |
| S2-23 | H03 | World addition but no legacy reference event | Reference category remains no_change; world entity has its own separate receipt |
| S2-24 | H04 | Narrative claim span copies player's `I enter...` without this sentence in output | Reject/mend only grounded output annotation; no false arrival |
| S2-25 | H04 | Narrative says `Jaxon has entered` without receipt | Fail closed or change to explicitly attempted/uncertain wording |
| S2-26 | H04 | Claim appears only in private message but declared party visibility | Scope rejection; no public projection |
| S2-27 | H04 | Unverified model claim a player knows secret NPC plan | No disclosure absent sourced actor-visible fact and witnessed NPC knowledge |
| S2-28 | H04,D06 | Claim of a Hope/Fear roll total but no native roll receipt | Never display invented die results |
| S2-29 | D01 | Two different accepted roll-required actions in one Discord message | Two independent native roll request keys and no cross-adjudication |
| S2-30 | D01 | Replay exactly same accepted action | Same roll request identity and no extra dice/charges |
| S2-31 | D01 | `srd:` reference string not in verified SRD index | Provisional/blocked adjudication; no roll request from fabricated rule source |
| S2-32 | D01 | A legal risk requires roll; model labels only `roll_required` | Native pending request created and delivered privately |
| S2-33 | D01 | Roll is `needs_review`, no adjudicated modifier | No false actionable pending state or misleading 'roll now' message |
| S2-34 | D02 | Owned card and Experience each have possible bonus | Correct separate options, costs, constraints, no inferred application |
| S2-35 | D02 | Model names unowned card | Rejected candidate, not displayed as legitimate choice |
| S2-36 | D02,D04 | Net disadvantage + Help without saved exception | Ruling-required path; no helper spend or roll |
| S2-37 | D03 | Unauthorized user clicks someone's private bonus select | Denied without leaking labels/sheet or state mutation |
| S2-38 | D03 | Owner clicks same expensive option twice concurrently | Exactly one authorization and spend; stale second click safe |
| S2-39 | D03 | Owner clicks old revision after GM changes stakes | Stale rejection, fresh private state, no spend |
| S2-40 | D03 | Bot restart before final bonus confirmation | Pending private menu can be reconstructed; prior selection not charged twice |
| S2-41 | D04 | Owner selects alternative legal trait | New native breakdown and Difficulty only where rules permit; not silently highest trait |
| S2-42 | D04 | Owner explicitly shares result with party | Only permitted redacted result; private traits/card options absent |
| S2-43 | D04 | Owner declines Help/Tag Team request | No participation, resource spend, or forced consent |
| S2-44 | D05 | Jaxon attempts to kick Choso | Conflict held for authorized consent/native adjudication; no PC injury from prose |
| S2-45 | D05 | Tyrell speaks while others act independently | Independent conversation not blocked by unrelated action window |
| S2-46 | D05 | Two PCs grab the same exclusive leaking parcel | At most one custody winner; proper conflict receipt |
| S2-47 | D05 | Player action arrives after closed window | No retroactive overwriting previous native outcome |
| S2-48 | D05 | Explicit Daggerheart reaction opportunity exists | Eligible late reaction allowed only while genuinely open; no timer forfeiture |
| S2-49 | D06 | Billy says he leaves door alone AND troubleshoots terminal | Nondependent speech/choice acknowledged; terminal action resolved or pending individually |
| S2-50 | D06 | Precondition roll is pending; dependent custody claim follows | Dependent suspended while unrelated action executes |
| S2-51 | D06 | Native roll later resolves and action graph is resumed | Only descendants become ready, no parent reroll; exactly-once receipt |
| S2-52 | D06 | `strict:true` reconciliation sees actionable intent without receipt/request/block | Transaction rolls back with useful diagnostic; no ungrounded success prose |
| S2-53 | D06 | Interruption after commit before Discord delivery | Outbox retries projection without rerunning native mechanics |
| S2-54 | D07 | Private clue for Billy and character swap under same user | No transfer to Tyrell/party/NPC cognition |
| S2-55 | D07 | Same named 'Night Owl' in different parent locations | Separate entity identity; no alias-based place conflation |
| S2-56 | D07 | NPC hears Tyrell's public warning through physically accessible scene | Source-backed dialogue memory only for eligible witnesses |
| S2-57 | D07 | Rumor that parcel is cursed | Testimony preserved, not objective canon by repeated memory |
| S2-58 | D08 | Failure event logging and counters | Error reference maps to internal turn/action without public private text |
| S2-59 | D08 | All baseline offline suites + new regression suites | Zero test skips, network denied, zero paid tokens |
| S2-60 | D08 | Public/private speaker source mix | No cross-character authorization, private knowledge disclosure or fake NPC presence |

## Acceptance reporting format per case

For each implemented scenario, record `(case_id, red_first_sha, green_sha, test_command, pass/fail, source_receipt_kind, privacy_assertion, idempotency_assertion)` in a test report or the progress ledger. Negative cases must exercise the production-path validator rather than mock it away. If actual Discord network access is disallowed, invoke a faithful fake interaction that enforces Discord's real content/component limits; classify live staging as deferred, not passed.
