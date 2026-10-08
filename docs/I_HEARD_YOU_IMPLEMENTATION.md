# I Heard You — phased implementation and operator guide

Baseline 8.0.0 (`cb2f384`), schema 440. Planned minor phases 8.1–8.9, followed by requested 9.0.0 major integration/recovery rollover. Each phase must pass the full network-denied offline gate and commit before the next phase begins. No planned phase is complete until evidenced below. User requested production pull on completion; pushing the release, if absent remotely, needs explicit authorization.

## Contracts and safe rollout

Existing native city records, roll tables, ledger, scopes, reviews, snapshots and RNG remain authoritative. New flags default false and AI delegation remains manual. No live campaign migration, configuration activation, real Discord registration, model/TTS request or bot restart occurs during implementation. New schemas follow closed structured-output contracts from [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs), with local authority validation; a model shape/confidence is never consent.

Player narrative prompts are open-ended prose. Internal backend statuses and optional mechanical slash commands remain compatible; no A/B/C answer list, predefined PC line or consent button restricts the reply. Missing/ambiguous authority stays pending and requests open clarification. Current ownership, attendance, scene, scopes, revision, exact terms, source and resources are rechecked at commit. Disabling flags stops new work without deleting history; snapshot/backup restore is an explicit operator choice, not an automatic refund.

## Behavioral acceptance matrix

IHY-01..IHY-12 map to roadmap proposals; required scenario numbers 01–26 map to the production fixtures as phases close. Initial verdicts and unresolved limits: `I_HEARD_YOU_GAP_ANALYSIS.md`. Every release reruns prior suites; fixtures must report actual outcomes, known ambiguity and zero live requests rather than claim unrestricted live-model reliability.

## Phase 1 — 8.1.0 (starting HEAD cb2f384)

Extends the authenticated `index.js` routes, native listener memory, normal GM context/closed intent contracts, shared turn commit, post-commit owner-private delivery and native city records. No schema migration. `roll.prepare` is only preparation: no dice, Hope, spotlight, PC action or success. Manual GM `/vc-roll request json:` uses the same validator. `/vc-roll pending` is owner-scoped and zero-write, including its command entry point. Raw Duality cannot bypass an existing pending request when the new flag is enabled. Flag-off legacy behavior is unchanged.

| Behavior / acceptance scenario | Production evidence | Status / limits |
| --- | --- | --- |
| IHY-01, scenario 19: owner-authored speech/mixed attempts; exclude OOC, hypothetical, third-party and wrong controller | `i-heard-you-1-test.mjs`, captureDialogue/captureDeclaration and normal GM context | COMPLETE for conservative explicit first-person quoted syntax; arbitrary prose semantics remain UNVERIFIED |
| IHY-02 foundation, scenarios 01–02: actual distinct traits, sourced flat modifiers, no Proficiency/Experience fabrication | Same suite, GMService → commitGmTurn → real roll adapter → format/private publisher | PARTIAL: attacks, active feature mechanics, source completeness and amendment/resolution belong to phase 2; unsupported features stay provisional |
| Scenarios 15, 25: native replay/private delivery recovery/restart/snapshot | Same suite, real receipt and persistence modules | COMPLETE for pending preparation; collaboration receipts not implemented yet |
| Scenario 26: offline guard | New suite is in required `npm run validate` gate | Synthetic Responses only, no claim of verified arbitrary live-model interpretation |

New flags default off. Optional enabling commands (do not execute against a live campaign during development):

```text
/vc-city flags json:{"natural_language":true,"roll_requests":true,"dialogue_history":true,"scene_continuity":true}
/vc-story delegation json:{"mode":"routine_delegated","allow":["roll.prepare"],"max_operations":4,"max_cost":0,"expires_minute":1000000000}
/vc-roll pending
```

AI policy replacement is explicit: merge desired existing allowlisted operations when retaining earlier delegation. Expiry is fictional time. No consent or spending is delegated. Roll resolution/Help/Tag Team are not enabled by this first-phase release. Requests are historical sheet snapshots pending fresh authority checks at resolution; missing values and attack features stay `needs_review`. Current safe speech recognition accepts `I say to listener: "..."` (also ask/reply/whisper) and legacy `say:`; unrecognized text remains available to normal GM clarification, not assumed speech/fact.

Verification: targeted IHY1 suite and the complete required `npm run validate` passed with network denial and zero billable requests. Existing regression suites remain in the gate. Phase closure reruns the full gate after final source/doc synchronization. Production remains 8.0.0 until all requested phases and the major release complete.
