# V96-05 / SEM06 — ordinary-scene material output P0

**Current status (2026-10-13): V96-05R QUALIFIED offline; reproduced P0 closed at the common certified boundary.** Starting anchor `aeffb8e3b5ec2a9bfee18af7081fea0ab49e181d`. Final validator **140/140**, zero failed/not-run, both D08 gates/check passed. Six original SEM06 assertions and original PVP30ag positives remain unchanged. Owner-approved audience-isolated fresh NPC authoring preserves expressive attributed speech; no sentence exception, whole-profile pass-through or self-certified safety flag. Native canon/witness/knowledge/resource-result/goal audits remain independent of quarantine. The constrained qualification does not certify arbitrary English meaning or unrestricted legacy output: [contract/risk/compatibility limits](V96_05R_OUTPUT_CONTRACT.md), [actual results and local completion commit](V96_PROGRESS.md). No push, deployment or later phase. The older blocked experiment and chronology below are historical, not current results.

Starting HEAD: `de0c949533960cfe7c0866ee0e0f6ff9a5fb2a25` (qualified V96-04). This finding is **not** a V96-05 completion or release qualification. No production/runtime implementation changed during this probe.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Reproduction

`node --import ./scripts/offline-guard.mjs --test scripts/v96-semantic-output-p0-test.mjs`

Final actual result: **2 passed / 4 failed / 0 skipped**, exit **1**. TEMP log `veiled-v96-05-p0-final.log` (initial four-case reproduction: 0/4, exit 1, `veiled-v96-05-p0-red.log`). Temporary four-owner SQLite fixtures only, denied network, injected provider, no live/paid calls.

Two unsupported material paragraphs:

- `Jaxon's left leg has been reduced to an unusable mess.`
- `Choso makes peace with defeat and hands over ownership of his courier case to Jaxon.`

For each, the **direct** ordinary-scene `validateNarrativeClaims` call accepts an empty `narrative_claims` array despite `semantic_integrity:true` and no PvP agreement. Its negative assertion fails with `Missing expected exception`.

For each, the **actual** `GMService.runTurn` → native preview → `commitGmTurn` → `queueTurnPublications` path accepts current owner text `I wait.`, a real begin-turn receipt, one exact typed `other` intent, no events, no dice and no receipt authorizing injury/choice/custody. One injected provider request occurs. PC resources remain unchanged; no native roll request exists. The unsupported paragraph nevertheless enters **one publication payload**; the negative assertion fails `1 !== 0`. Tests permit either native rejection or independently verified safe projection; they do not demand suppressing unrelated native output or global silence.

Positive controls pass: the same novel injury **declared as a material claim** is rejected for `uncommitted_damage`; harmless idiom and ordinary GM atmosphere remain valid. This isolates missing output-coverage authority rather than a missing owner/source fixture, native HP bypass, or a requirement to forbid all prose.

## Root cause / reachable sinks

| Boundary | Actual gap |
|---|---|
| `narrative-integrity.validateNarrativeClaims` | Enumerated claims get native validation, but omitted claims are caught only by bounded English tripwires. Novel material assertions evade them. |
| `pvp-output.protectedPvpScope` | Strict clause/receipt projection is activated by current PvP agreements (or existing special observation/world-part paths), not every ordinary scene containing a PC. |
| `prepareAuthorizedTurnOutput` | With no protected agreement, observation query or GM-world part, returns raw candidate prose unchanged. |
| `assertPvpOutput` / `queueTurnPublications` | Unprepared raw output is allowed without protected agreements, so ordinary-scene commit/outbox has no independently certified coverage proof. |
| `revalidateOutputPublication` | Without a bound output proof and protected agreement, delayed delivery does not acquire the missing semantic authority. Restart cannot cure the missing proof. |
| `reconcileConsequences` | A valid `other`/conversational intent is acknowledged; it cannot certify unrelated material claims hidden in narration. Existing `uncertain()` English matching is not a completeness proof. |

No source/receipt actually establishes the asserted injury, Choso's acceptance, surrender, or case transfer. Native resources are still protected; misleading narrative publication is a separate P0.

## Why no shortcut was applied

1. Adding these two sentences/verbs to a regex would only hide these fixtures, not implement SEM06's novel-wording requirement. Tripwires stay defense-in-depth, never meaning/outcome authority.
2. Requiring another model `safe`, `nonmaterial`, subject list or nonempty claim list cannot certify the meaning/completeness of raw paragraphs. The model cannot mint its own output authority.
3. Blindly treating every ordinary scene as existing protected-PvP output would quarantine ordinary freeform narration and replace it with the current closed speech-act catalog/neutral fallback. That conflicts with the plan's quality floor, no global freeze and explicit prohibition on rigid prose-script replacement. No such global change was made.
4. Disabling material validations or permitting an arbitrary GM approval to certify another PC's response violates existing ownership/native authority. No assertions were relaxed, outcomes invented, or source/consent controls removed.

The unresolved integration is a **source-complete ordinary-scene output contract/composer** that can isolate material PC clauses, render them only from exact native receipts/current owner-authored material, and independently preserve expressive GM-owned fiction and unrelated actions. It must bind the same proof through direct validation, commit, outbox, delivery/restart, shared memory and voice; a regex extension or all-prose suppression is not qualification. The current protected-scene renderer is useful infrastructure, not evidence that this broader contract already exists.

## Gate / resume

V96-05 is **P0 BLOCKED**, uncommitted. The new suite and mandatory release-registration assertion are included in the default validator; no intentional skip. The last full **137/137** result belongs to committed V96-04, not this **138-suite known-red** working tree. Under lean policy a known failing P0 is diagnosed with focused runs; no redundant complete validator was run or claimed green after this probe.

Do not commit V96-05, optimize tokens, start V96-06–08, push or deploy this checkpoint. Resolve/qualify the general output contract before further lexical retirement. SEM04 personal candidates, SEM05 canon proposals and SEM07 dossier inference were inspected but remain unimplemented; their lexical source decisions were not removed speculatively while SEM06 is red. Keep native receipt, privacy, withdrawal, PvP, FH40/PVP30q/OBS21 and D08 gates. After a safe fix, add source-backed positive/idiom/independent-action/private/restart tests and run the complete phase gate.

No SQL migration, live model/Discord call, production data access, resource alteration or rollback operation occurred. The dirty work consists of reproduction tests, default registration, result/progress documentation and synchronized manifests; preserve it for the next implementation turn. Rollback of these uncommitted artifacts would remove the reproduction/gate, not solve the runtime defect, and is not recommended.

## Resume audit / clarified owner policy (2026-10-13)

Actual local branch `codex/typed-intent-refinement`, HEAD `de0c949533960cfe7c0866ee0e0f6ff9a5fb2a25`; original dirty reproductions/registration/documents/manifests preserved. No fetch, reset, clean, staging or commit. This blocker and its reproductions are **local, uncommitted artifacts**, not represented as published repository documentation.

Owner policy now expressly covers ordinary/private/Director/continuation/deferred output: broad natural GM fiction is allowed; completed PC material effects, choices and custody require the appropriate current native/owner authority. Attempts and threats are not completed effects. Empty claims, model labels, proposed rolls or high dice are not proof. The policy itself is clear. The outstanding implementation choice concerns **independent coverage/meaning verification for newly generated freeform prose**, not whether PC ownership should be protected.

The six original cases were rerun **unchanged**: **2 pass / 4 fail / 0 skipped**, exit **1**, TEMP `veiled-v96-05-resume-red.log`. An initial read used an incorrect duplicated `bot/` prefix; the subsequent source inspection used the correct root path, and the test command itself ran from `bot` successfully. This read-path mistake did not cause or alter the four failures.

For payload inspection, a separate in-memory diagnostic copy added only a console snapshot before the original assertions (relative imports resolved to their original files). No original test file or assertion changed. Same **2/6 pass / 4 fail**, exit **1**, TEMP `veiled-v96-05-output-audit.log`. Both snapshots show exactly one injected generator request, a **pending party publication** whose payload is exactly the offending paragraph, and **no `pvp_output_publication` proof**. These are synthetic fixture payloads, not player/campaign telemetry.

### Confirmed defect-to-boundary matrix

| Reproduced case | Missing enforcement | Fixture / expectation assessment |
|---|---|---|
| Direct novel injury | `validateNarrativeClaims` validates supplied claims; finite tripwires do not independently establish coverage | Valid security expectation; no native injury/effect receipt exists |
| Direct forced choice/custody | No protected agreement activates `assertPvpOutput`; omitted consequential claims evade checks | Valid security expectation; current owner `I wait.` cannot authorize Choso's response/transfer |
| Combined-turn injury | Both calls to `prepareAuthorizedTurnOutput` can return raw prose; valid conversational intent reconciliation is not injury authority | Production defect; preview and final commit both accept, raw payload is queued |
| Combined-turn choice/custody | Same raw-output path; queue assertion/binder does not require an ordinary-scene coverage proof | Production defect; raw payload is queued, not just returned by a helper |
| Declared injury control | Existing native effect validation rejects `uncommitted_damage` | Correct passing expectation; retain unchanged |
| Harmless idiom/atmosphere control | Ordinary nonmaterial narration currently allowed | Correct passing expectation; forbidding all raw prose is not a valid fix |

Actual order inspected: GM exact-source recovery → native preview; `state` output preparation → typed persistence/dependencies → native world application → second output preparation → memories/events/cognition/validation; final `commitGmTurn` repeats native application, performs native rolls/continuations, reconciles when typed intents exist, then queues within its transaction. A real typed intent does exist in both integrated failures, so making reconciliation unconditional would **not** by itself fix them. No native damage, consent, choice or custody receipt matches the prose.

Queue/deferred enforcement inspected: `queueTurnPublications` invokes `assertPvpOutput`, hashes/chunks the payload and invokes the binder. Binding depends on an existing prepared proof. `deliverTurnOutbox` does call revalidation before transport; `revalidateOutputPublication` rejects a missing proof only in protected PvP scope. Thus the missing ordinary-scene proof is not supplied later by persistence or a transport receipt. A content hash detects alterations **after** acceptance; it cannot establish that the initially accepted paragraph was authorized. Deferred/private/revoked-source combinations have not been newly behaviorally qualified in this resume; no broader PASS is claimed.

`voice.narrate` currently requires delivered native publication proof when `protectedPvpScope` is nonempty; ordinary output is not covered by that same condition. Publishing/archive hooks also use protected scopes and bound parts. These are inspected integration targets, not new reproduced live/voice failures. No voice, Discord or provider endpoint was called.

### Native reuse assessment and decision required

The existing part renderer supports owner clauses, observations, native notices/continuations, native arrivals and Fear effects, plus `gm_world_narrative`. Those provide valuable independently revalidated sources and restart-safe payload binding. The GM-world schema, however, accepts only enumerated speech/atmosphere acts and tones. It has no independently verified unrestricted-prose part that can certify absence of implied PC effects. A new model-filled actor/safety/claim-coverage field or a native receipt containing only a hash of generated prose does not supply that missing proof.

The following alternatives were assessed but **not implemented or qualified**:

1. **Source-only publication / authenticated scope review for unproved paragraphs.** Native/owner-backed clauses and independent actions continue. Arbitrary new prose without source-complete proof is held, including some legitimate mundane description/dialogue. This preserves the strict authority boundary but requires explicit acceptance of that responsiveness/narrative restriction; merely globalizing today's fixed catalog would additionally violate the no-rigid-prose rule.
2. **Independent whole-turn semantic screening, followed by native validation of detected consequential assertions.** This is not a provider call per clause and does not grant mechanical outcomes. It would nevertheless have probabilistic omission/meaning failures and potentially another request per generated turn. It must not be described as source-complete proof or universal detection. Explicit owner acceptance of that residual publication risk and request-budget change would be required before adopting it as the missing coverage screen.
3. **Caller/model partitions or bounded phrase matching alone.** Not acceptable: partitions can mislabel actual meaning, and more forbidden phrases only repair finite examples. No such workaround was applied.

Under the resume instruction's stop condition, V96-05 remains **P0 BLOCKED** pending an explicit decision on this tradeoff or an independently verifiable richer representation that meets both requirements. No runtime changes, test weakening, schema migration, phase completion commit, full qualification, later-phase work, push, deployment, secret access or paid/live operation occurred. The preceding 137-suite result remains historical; the current registered 138-suite tree is known red. Do not commission SEM04/05/07 retirement or V96-06 until the P0 is actually fixed and qualified.
