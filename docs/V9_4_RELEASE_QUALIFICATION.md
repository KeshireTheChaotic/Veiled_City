# v9.4 / V9-08 offline release qualification

Status: **D08 PASS — offline qualification**, based on the actually executed candidate gates below. The completion commit requires a successful unchanged documented-tree repeat; any failed repeat reopens BLOCKED and prevents commit/push. This is not production deployment approval. Version remains **10.0.0**; version alone is not release evidence. No live bot, production database, credential, command registration, model endpoint or deployment was accessed.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Independently committed phase ledger

| Phase | Completion commit |
|---|---|
| V9-00 | `c4e08d78f347ffafc8c7e64cff825fdce868bc29` |
| V9-01 | `697f088fe3c6c576472718c5ec34f903ccb1e2bd` |
| V9-PVP-A | `2b8d807d11cfe15e47b8eeed2d17ac912203091f` |
| V9-02 | `1149dc908636d78177e3e38a3e850c2de0215500` |
| v9.4 B.1 universal native PC resource authority | `9d3bde14f40263e0f62aa3dec237e7457f607f41` |
| B.2 observation/output authority | `7cd843c79ad3f432422432c0cd029ac8e140372b` |
| B.3 versioned damage/multiplayer consent | `fe0af0c40dc99b1ad26f85f7154c69af53d2df74` |
| B.4 Evasion attack/reactions | `609389223e06ccf2e42313ee1d8f965174a55aa8` |
| B.5 damage/Armor/death/recovery | `5bed9e56ddb879ac0a7f3c6bdb2b71597cb9cd69` |
| B.6 multiplayer opportunities/locks | `1f690575a05d5adbc3204be46be28bc329bb4cd7` |
| B.7 behavioral qualification | `f81354607050bfa0dfe22829d63109db1c3bc9a2` |
| B.8 / V9-PVP-B completion | `25c535989d0e2bc7962a1a7e39998dc35f622e5a` |
| V9-03 durable continuation | `d90a6dc7fea6092a4606479e3dfb5881313d46e5` |
| V9-04 actual native roll truth | `26f7092800606f2b4d8f0640755cc23355bdaa6a` |
| V9-05 crash-safe publication/recovery | `b8a916c8d67ee306c992a8f1dcce69bfb2661e09` |
| V9-06 private UI/minimal disclosure | `942bd0db37bd165a24e53e23725b6847de326982` |
| V9-07 Discord/no-session hardening | `9d8c01a399e933e70da2315d3c1d4df72924d7a0` |
| V9-08 release qualification | Commit containing this final ledger, after successful final repeat; full resulting SHA in final handoff / `git log -1 --format=%H -- docs/V9_4_RELEASE_QUALIFICATION.md`. A commit cannot contain its own hash. |

The known-red WIP commits `55b006e`, `bf6b592`, `355269d` and `0d3d909` are preserved in history, **not** phase completions. Earlier D08 BLOCKED entries are historical; only successful final qualification may supersede them.

## Actual validation results

| Measured boundary | Actual results |
|---|---|
| v9.4 original known-red WIP baseline | Progress records actual **105 suites passed / 1 failed**, two FH40 P0 assertions; not a green release. |
| This resume, completed V9-06 | **122/122** mandatory suites, **441/441** focused tests. |
| V9-07 final documented tree | **123/123** suites, **455/455** focused tests; sync **536** files, syntax **292** modules/scripts, **24** command schemas, original interaction/H05/D03 and standalone D08, diff-check: all exit **0**. |
| V9-08 synchronized source candidate | **126/126** suites, **473/473** tests across 29 focused suite files, zero skips/cancellations/failures. Sync **538** non-runtime files; syntax **293** modules/scripts; **24** command schemas; standalone D08 security and observability; phase inventory/replay **16/16**; diff-check: all exit **0**. |

The full offline report states `network:denied`, `live_requests:0`, `billable_tokens:0`; the guard fails the process even if a denied outbound attempt is caught. No dependencies were added and no installation was necessary in these final phases. Suite counts and matrix-case counts are distinct. Earlier failed fixture runs and corrections are recorded in progress, not relabelled passing. After this results/status annotation, synchronize metadata and repeat focused/check/full/D08/diff gates on the unchanged documented tree before the independent commit. An unexecuted repeat is not a claimed pass.

## Replay and authority evidence

Qualification is a collection of mandatory temporary-store **production-path** replays, not a fabricated live-model transcript or one synthetic all-powerful GM response. Actual command/turn/publication adapters run with network denied and deterministic native entropy; stored dice/effects are created by native services, never prewritten as expected successes.

| Scenario | Mandatory suites / actual adapter path |
|---|---|
| Four owners; accepted and declined Duel; Three Strikes 3–2; Critical below a higher total; zero PvP Hope/Stress bonus; two immediate Fear consequences; withheld and separately owner-authored reaction; actual disclosure/outbox | `v9-release-qualification-test` REL02: real `handleCommand` defer/reply/follow-up, native private/public publishers, terms/revisions, owner clause/disclosure, restart without RNG. |
| Billy shipping compound, uncertain native request, suspended movement, private menu roll, exact-once continuation; independent unsafe prose quarantined | REL02 plus `v9-continuation-test`, `v9-roll-truth-test`, `compound-action-test`, `d06-continuation-test`; actual source/begin-turn/`commitGmTurn`/menu/outbox. |
| OBS21 Station Attendant blue coat; unknown/partial PC appearance; visible clothing/dialogue/activity; no private sheet/log/thought or compelled description | REL02, `v94-pvp-qualification-test`, `v9-observation-compatibility-test`, `v9-npc-observation-test`; actual source/turn and GM-selected native description. |
| Exact apology, both Billy cross-actor negatives, source/owner/scene/audience TOCTOU, raw Director/private output, summaries/recaps/cognition/journal/voice | Original unchanged `v9-pvp-authorship-test`, observation compatibility and native publication suites. Empty claims or an approved paragraph never authorizes PC reaction. |
| Original manual World Director and private `I wait.` HP mutations rejected; legitimate healing/cost and NPC→PC native effects remain available | Unchanged FH40 in authorship suite plus `v94-pc-effect-authority-test`, `v94-pvp-qualification-test`; no global scene freeze. |
| Separate damage consent; current Evasion, equipment/proficiency/thresholds/resistance/direct damage, owner Armor, optional reactions, vanilla last HP/death and all death moves | `v94-pvp-profile-test`, attack/reaction/damage/death/recovery suites. Real private Discord damage/Armor/death review/choice adapters; actual source/cost/dice/effect receipts and replay. |
| Guaranteed-nonlethal tiers unavailable | Owner superseded PVC03/04/PVD18/19: negative profile tests; use harmless narrative or separately disclosed vanilla death-risk damage. Never silently cap HP or replace the owner death choice. |
| 3+ FFA and 2v2; target-specific signatures; fair elective opportunities; simultaneous aggregation; late joins/withdrawal/independent fourth PC | `v94-pvp-multiplayer-test`; native opportunities/windows/target locks and real private command adapters, restart/rollback and valid surviving edges. |
| NPC→PC Fear attack, double-Fear ordering, proportional source-grounded consequence, pending defense/Armor, Billy interruption and Tyrell independence | Qualification, multiplayer and `v9-pvp-hope-fear-test` FH36/37; immediate native obligations, no banked pool/future credit/cosmetic discharge. |
| Action-bound consent, custody, refusal/revocation, old windows and genuinely new occurrences, privacy and exactly once | `d08-window-security-test`, action-consent/window suites; actual native custody and neutral recovery, no invented winner. |
| Private options, helper/Tag Team scope, alternate traits/Experiences, complete paginated costs, source-confirmed bounded sharing | `v9-roll-ux-test`, original D02–D04/integration, roll truth/publication suites; real button/select and slash adapters. |
| Partial/uncertain Discord sends/restarts, immutable chunks, before-I/O receipts, no blind resend, GM verified reconciliation/resync | `v9-publication-test`, H05, continuation and native publishing suites. Revalidation at send, actual message/channel acknowledgment IDs. |
| UTF-16/fences/mentions, disabled private delivery, no-session pending/result, changed principal/evidence/proxy scope, read-only queries | `v9-discord-hardening-test`, H05, interaction lifecycle; actual message and slash paths, no public fallback or query-output memory writes. |
| Legacy v1 records remain history, no retroactive consent/Hope clawback; no secret diagnostic bodies | Hope/Fear FH01–04, profile/death suites and mandatory `d08-observability-test`. |

The unchanged 270-row v9.4 matrix includes superseded policies and inherited cases; [B-phase coverage and owner rulings](V9_4_QUALIFICATION.md) explain these mappings. The old non-default V9-00 fixture is now mandatory and uses real native positives plus explicit fabricated-result/no-send negatives. Structural source checks only supplement behavioral tests.

## Changed production interfaces

B phases: universal source-verified PC effect eligibility, native incoming NPC attacks, versioned bilateral/group risk profiles, Evasion attacks/reactions, native damage/Armor/death/recovery, opportunities/target locks, clause-authorized output and observer-visible facts. These reuse campaign records/receipts and never make prose a native effect.

V9-03–07: durable `action_continuation`, exact `typedRollProof` and neutral outcome review, native reference notices on the existing publication outbox, verified delivery/reconciliation, shared slash/component publication pipeline, registry-bound paginated private UI, accepted-occurrence sharing previews, and revalidated bounded read-only discovery/no-session responses. Interfaces and changed files are recorded by phase in `TYPED_INTENT_PROGRESS.md`; authority remains in `TYPED_INTENT_CONTRACTS.md`.

V9-08 changes only validation fixtures/registration and documentation. No production schema migration or campaign transformation is performed.

## Migration and rollback (operator instructions only)

No automatic destructive cleanup is appropriate. On a **separately authorized offline copy**, inventory old offers/windows/effects and delivery statuses by identifier/version/source/owner/audience, not by exporting private prose. Keep imported characters, ownership, settings, source messages, actual dice, resource deltas and native outcomes intact.

- Old wildcard consent/unproved requests do not authorize new participation. Obtain fresh current source/action-specific consent and native adjudication; never convert old attack dice into story-stakes winners.
- Unrolled v1 narrative offers require new v2 terms and both current owner approvals. Rolled v1 remains inert history; no retroactive Hope clawback or term rewriting. Group expansions require fresh signed v3 edges/fairness policy.
- Pending Fear remains due. Use current native `fear-inbox`/context/select/effect/apply; defense/Armor pending is not a settled obligation. Reconciliation cannot waive real Fear or undo committed effects.
- Native damage/death remains saved; only the affected owner chooses/reviews current death recovery. Reverting code must not restore old HP or erase a new effect.
- Source/principal/scene changes hold affected continuation/output for explicit reviewed recovery, not fabricated receipt repair. Unrelated valid actions remain available.
- Old unbound roll-menu tokens require a fresh menu. Unsupported preview/notice records stay private/held; no silent upgrades or republishing.
- Delivered/uncertain chunks remain conserved. Use GM `delivery-status`, source-verified `delivery-resync`, reviewed `delivery-reconcile` and then only proven-unsent `delivery-resend`. Do not reroll or blindly resend.
- Roll back **code only** to a validated compatible checkpoint, retaining additive records and holding unfamiliar profiles. Never use the known-red WIP for live operation, restore an old DB over new results, truncate tables, or clear a session to erase evidence.

## Limits and deployment checklist

Passing offline tests does not certify arbitrary live-model free text, real Discord permissions, live latency, or all domain-feature mappings. Ambiguous clauses remain private scope review; unsupported features/rulings, changed principals/retracted sources and legacy damaged history require explicit legitimate native review. The owner disabled guaranteed-nonlethal damage and action-Critical Stress clearance; separately chosen matching Risk It All recovery remains vanilla. Narrative PvP is bilateral only; no invented N-way strike rule.

Before any deployment, obtain separate authority. Confirm the exact validated branch SHA, a clean compatible production Git tree, dependency/Node requirements, approved backup and offline-copy inventory, no conflicting private route permissions, and a rollback checkpoint that understands saved native records. Do not overwrite production `.env`, SQLite/WAL/SHM or imported content. Obtain separate authorization before command registration, startup/restart or any paid/live staging call. Test in an isolated Discord staging guild with synthetic PCs: private choice/disclosure, refusal/withdrawal, uncertain delivery/reconciliation and restart, source revocation, death-owner boundaries and independent fourth-player activity. Review resulting receipts and current audiences before deciding production go/no-go. **No such live staging or deployment was performed here.**

See [player-versus-player example outputs](V9_4_PVP_EXAMPLES.md) and [private controls](PRIVATE_ROLL_GUIDE.md). Examples are illustrative, never actual dice or consent.
