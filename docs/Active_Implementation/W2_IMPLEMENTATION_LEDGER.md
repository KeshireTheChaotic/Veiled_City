# W2 / UA14–UA15 implementation ledger

Status: **QUALIFIED BOUNDED NATIVE FRAMEWORK — LOCAL COMMIT PENDING**.
Starting HEAD: `38d32fa2e03bd5b9c32208f5beb0fb39405c8f16` on `codex/audience-first-narrative-v9`.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Complete phase manifest and ownership

| Family | Required production chain | Construction status |
| --- | --- | --- |
| Ordinary rulings / replay | accepted source → adjudication → native request/no-roll receipt → owner/private output → historical replay | Replay checks and normalized new-record terms fingerprint written; acceptance fixtures unrun. |
| Ordinary odds | sealed scene-board origin → contextual odds or exact sourced flat modifier → immutable mutation → private breakdown → pre-RNG / saved proof | Written: native contextual odds, inclusion of existing exact approved flat sources, source/scene filtering before bound, source/rule change checks and native/historical saved readers. Arbitrary flat amounts and feature activation are never inferred. |
| Help / Tag Team | independently authored contributions → native feasibility → separate owner authorization/payment → dice/cost/participation receipts → saved and private readers | Written: version-3 eligibility proposals, opaque origin and immutable mutation proof, exact sources/communication/disclosure, owner command notices, separate costs/dice/selection, current and saved consumers. Historical human review retained. Help/net-disadvantage remains held per owner ruling. |
| Equipped attacks / traits | actual owned equipped item + source-defined mechanics/acquisition → native target/range eligibility → owner preparation → saved attack/damage proof | Written: existing exact human-approved weapon/rule/target source → sealed preparation → native current-use/saved/delivery readers. Does not mint an acquisition/weapon license from an import. Actual same-zone target only; no guessed pairwise range. Existing unarmed/owner trait adapter retained. |
| Evidence interpretation | exact entitled handout/source → read-only interpretation authority → recipient-scoped receipt; no custody transfer | Written: exact owner-held visible document reading, scoped prompt material, native excerpt receipt, ordinary follow-through and shared projection/delivery reader. Novel conclusions stay unverified/reviewed, not facts/custody. |
| Encounter / routine world | native actor/template/policy/roster → bounded proposal/activation or routine operation → immutable current/historical proof → entitled output | Written: new explicitly delegated encounter.activate operation using existing actor/BP/roster planner; mutation/policy/source/owner receipts, current/historical reader and unchanged legacy bindings. Common delegated replay validates exact scope/source before return. Existing bounded goals/scene/service adapters retained, no broad major-world waiver. |
| Failure / restart / publication | stale source and choice holds, committed native results retained, exact-recipient notices and no resend of uncertain delivery | Written: expected native holds do not grant outcomes; private owner notices and generic deferred roll delivery revalidate new proofs. Resolved disclosure uses saved ancestry rather than re-executing current gear/cost checks. Existing uncertain-delivery engine is reused. |

Existing qualified W2A–K, S-GATE, W4 and standard-NPC pre-roll Fear are retained. Existing dirty W5 files and owner files remain preserved, not included as qualified W2 work.

## Acceptance fixtures (written, NOT RUN)

- `native-adjudication-replay-test.mjs`: five cases covering authenticated replay, audience, immutable terms, revoked declaration/request ancestry and structural legacy read.
- `native-roll-modifiers-test.mjs`: eight authored cases including existing flat sources and stale scene/rule negatives.
- `native-roll-participation-test.mjs`: four authored cases for board → private owner Help/Tag Team → costs/dice/selection/readback, privacy and revoked eligibility.
- `native-evidence-analysis-test.mjs`: fourteen authored cases including real ordinary-effect integration in party/private scopes.
- `native-encounter-activation-test.mjs`: twenty-two authored cases for explicit policy, actor/roster/BP, current/history/restart and authority/privacy negatives.
- `native-equipped-attack-test.mjs`: eighteen authored cases for exact existing approval, owner-native attack/damage, stale/ambiguous source and deferred delivery.

These are **71 source-authored cases**, not executed/pass counts. Relevant existing arbitration, rules, ordinary-effect, roll/menu/options, historical and D08 suites join the single phase batch.

## Retained source/owner boundaries (not claims of unsupported behavior)

- Inventory names/owner imports have no immutable item acquisition + mechanical-license receipt; native equipped preparation requires the exact existing approved source. New/unmapped equipment remains actionable through the existing authenticated GM adjudication command, not invented approval. No source-defined special weapon feature is made executable here; those belong to the exact W6 catalog/source work.
- Native pairwise range beyond the established same-zone subset is not inferred from a location-relative zone. Missing pairwise evidence holds that attempt; it does not freeze independent actions.
- Missing Difficulty on an old neutral roll cannot be retrospectively invented. Without contemporaneous exact native pre-roll evidence, the existing saved-result human-review path remains. Similarly, RULE_UNVERIFIED does not become a capability grant simply because a generic SRD action reference exists.
- Evidence reading certifies the existing document claim, not authenticity, guilt, unseen tests or novel scientific conclusions. Custody and restricted access retain their own native authority. Retained reviewed status operations are not silently converted into free narration.
- Optional costs, Help/net disadvantage, proxies, PvP, Armor/death, canon/private promotion and administrative policy retain their explicit source/owner gates. W3/W5/W6 expansions are not claimed by W2.

## Execution policy / evidence

No tests, checks, syntax, formatting, validation or provider inference executed during phase construction. Freeze SHA/fingerprint: **being recorded before the first phase batch**. Consolidated batch: **NOT RUN**. No passing count or phase-completion commit claimed.

One bounded worker (`w2_evidence`, GPT-6.1 Sol, medium effort) handled disjoint evidence source/fixtures/notes, then authored encounter and equipped fixtures sequentially. Coordinator reviewed/integrated shared source and repaired static concerns. Worker executed no tests/checks and made no commits. No permanent tester/reviewer worker; no local LLM or paid application calls. Actual model token totals are not exposed.

## Qualification record

Initial implementation freeze: HEAD `38d32fa2e03bd5b9c32208f5beb0fb39405c8f16` plus **512 code/test/package inputs**, SHA256 of sorted `path<TAB>file-SHA256` rows: `c5c8060be53ef71ddd4ea1b1b2bd435109faf1418ad3f5eb41e59c1a31a5955d`. Source-defined content is unchanged from HEAD. Results-only ledger updates are outside this executable fingerprint. `ready_for_tests=true`; no phase-qualified SHA yet.

First consolidated relevant batch follows this freeze. Record every failure before repairs; rerun failed/dependent suites together. Full mandatory release validation belongs to W7 only.

### Initial phase batch and remediation 1

Executed one network-denied batch of 22 explicitly selected files using `node --import ./scripts/offline-guard.mjs --test ...`; full command is retained in the session tool receipt and local log `bot/.reports/w2-phase-initial.log`. Exit **1**, **480 tests: 468 pass / 12 fail / 0 cancelled / 0 skipped / 0 todo**, duration **190227.4435ms**. This is targeted phase evidence, not full mandatory qualification.

Failure inventory collected before edits: eight modifier cases stopped at fixture intent validation (`roll_required` lacked grounded adjudication); four collaboration cases stopped because fixtures omitted scene-continuity setup. Repair uses conversational declarations with subsequent native adjudication, real location/presence and the required opt-in; original assertions remain. The Tag Team fixture shared the premature resolution issue and was corrected in the same pass.

Static dependency review additionally found Help's PC target would hit generic hostile classification before collaboration eligibility. A narrowly sealed prepass now handles only the current version-3 native Help eligibility/review selection before PC-conflict staging. It grants no PC action, harm, consent, dice or resource outcome and does not change global `isPvpIntent`. Added one full `applyAuthoritativeMutation` acceptance fixture. Current/saved collaboration inspection permits this exact eligibility role, not arbitrary PC effects. New authored-case total: **72**, not a passing-test claim.

Remediation-1 freeze: same base HEAD, 512 inputs, fingerprint `637ee1235c978b90083d3bdab02cedd509da9d11927d0ce7c26d8540ede8246d`. A **single combined failed/dependent-suite rerun** follows. Because the shared authoritative turn path changed, the original 22 relevant files remain affected. No tests were executed between individual repairs; no W3 work started.

Remediation-1 actual result: exit **1**, **481 tests: 469 pass / 12 fail / 0 cancelled / 0 skipped / 0 todo**, **177128.7485ms**, `bot/.reports/w2-phase-remediation-1.log`. Complete inventory: seven modifier cases reached a real private-source boundary rejection; five collaboration cases stopped at missing narrative-authority fixture flags. The forged-origin modifier negative now passes. All other selected files passed.

Remediation 2 keeps mutation-backed eligibility/odds events **GM-private**, querying/verifying their explicit owner bindings internally and rendering only verified owner projections. The global `indexWorldEvent` private-source guard is unchanged. Collaboration fixtures enable existing narrative-authority flags. Two modifier fault-injection fixtures now use the DB event-save test boundary: `indexWorldEvent` correctly refuses to rewrite immutable existing events, so using it to simulate at-rest tampering did not actually alter data. Original negative expectations are retained. Shared DB modifier lookup changed; the original failed/dependent 22 files remain the combined rerun. No opportunistic tests during repairs.

Remediation-2 freeze: same HEAD / 512 inputs, fingerprint `86e1531367fd71a51171522f9482aeeaeb79a0baa296c6ac90340b768cde3323`; rerun pending.

Remediation-2 actual result: exit **1**, **481 tests: 479 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo**, **175187.4519ms**, `bot/.reports/w2-phase-remediation-2.log`. All production integration, Help/Tag Team, evidence, equipped/encounter, historical, publication, D08 and selected PvP/HP guard cases passed. Remaining two modifier fixture failures: revocation was correctly denied via the captured rule-revision check (over-specific expected message), and `saveWorldEvent` preserves existing scene metadata, so the old-scene fixture still had current metadata.

Remediation 3 changes **only** `native-roll-modifiers-test.mjs`: accept the specific rule-revision denial while retaining revocation and zero-RNG assertions; create a distinct synthetic historical event and retract the current fixture event instead of attempting to rewrite immutable metadata. Production code is unchanged. Rerun the complete affected eight-case file together; do not rerun already-passing unrelated files merely for fixture-only edits.

Remediation-3 final executable/test fingerprint: `35635e5bda7002c2b7d491ef0fd25ee754a6e9516f83fb4de7ad1ecb195c08b7` (512 inputs, same base HEAD). Command: `cd bot; node --import ./scripts/offline-guard.mjs --test scripts/native-roll-modifiers-test.mjs`, log `bot/.reports/w2-phase-remediation-3.log`. Exit **0**, **8/8 passed**, zero failed/cancelled/skipped/todo, **2110.8191ms**. No production changes after the 22-file remediation-2 batch. Qualification is **composed evidence**: 473 unchanged cases passed in that batch + eight final affected-file cases = 481 covered cases; **not** a fabricated single final 481-green invocation. One initial consolidated batch, three collected/batched remediation passes. The original source/agency/privacy/PvP assertions were not removed.

All new producer → receipt → current/saved reader → owner/output integrations in the manifest are implemented and exercised for their documented source-supported scopes. Retained authority/source boundaries above remain enforced, not marked as universally automated. Existing qualified families were preserved. No source or test work for W3/W5/W6 was included in this qualification; preexisting dirty W5 work remains on disk and is explicitly not qualified by these results. Final W7 must qualify the complete integrated tree.

Offline guard enabled throughout; no live Discord, production access, real provider/model sampling, push or deployment. No full mandatory registry, syntax/quality/format gates or generated-manifest check run here. Those remain W7 release gates. Local implementation commit to follow; next phase W3 construction, no tests until its full freeze.

Rollback preserves all source, native dice/cost/effect receipts and acknowledged outbox history. Disable new preparation rather than alter committed campaign outcomes.
