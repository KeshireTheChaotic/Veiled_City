# V9.5 release qualification — offline evidence; V95-06 bypassed

**Owner amendment (2026-10-12): V95-06 is BYPASSED. V96 is not contingent on live-play testing or a V95-06 completion commit.** The former blocked requirements below remain historical/unexecuted evidence, not current prerequisites. This decision does not turn unrun CI or live tests into PASS, waive any V96 offline phase gate, or authorize push, production, Discord or paid API operations.

Date: 2026-10-12. Version: **10.0.0**. Source checkpoint: `25f6d8013d0a6b07fca1e023d32d16de3e1eea25` on `codex/typed-intent-refinement`.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Phase ledger

| Phase | Status / independently reviewable commit |
|---|---|
| V95-00 | Completed `1b36ee111266da1a3c19e8d4da40288b1db474fc` |
| V95-01 | Completed `e729a10e40f5cfee151a694a93242d222444a853` |
| V95-02 | Completed `708d0bd687f6810037ff0829a2ee19f654c79c8a` |
| V95-03 | Completed `fa795c510e922049569b9d960df40b9decaa4f80` |
| V95-04 | Completed `194a64a6405a0068eb1c0a13d7ff0e38b18d1b11` |
| V95-05 | Completed `25f6d8013d0a6b07fca1e023d32d16de3e1eea25` |
| V95-06 | **BYPASSED by owner decision (2026-10-12)**; no completion commit or separate release-gate claim |

The completed V95-05 source has actual offline qualification, including the four-owner production-adapter replay. V95-06's separate final release gate has **not** been run or claimed; the owner has now bypassed that phase. Do not waste a duplicate full run merely to label these handoff documents passing. V96 may proceed without V95-06 completion or live-play testing, subject to its own sequential local offline phase gates. No unexecuted staging fixture is registered as a passing pilot.

## Actual same-source offline evidence

V95-05 T2: `npm run validate` exit **0**, **132/132** suite subprocesses, **0 failed / 0 not-run**, **366,060 ms**. Every original 130 suite and acceptance mapping retained. D08 window security and observability both passed exit 0; FH40, exact PVP30/q, OBS21, native attack/Armor/death/recovery, Fear and delivery remain mandatory. Network denied in test subprocesses; live API requests 0, billable tokens 0. JSON summary and nonpassed rows inspected, not successful TAP logs. Report is local/ignored and overwritten by each validator invocation.

Separate `npm run check`: **303** modules/scripts and **24** schemas, exit 0. Inventory: **303** module/script/backup entries, **4,202** assertion sites, **270** original requirements, zero unmapped candidate references (NOT semantic equivalence). Source/input manifest: **567** non-runtime files at V95-05; byte/hash checks passed. `git diff --check` passed. Executable fingerprint: `36a9a1995b45719a2407a7c7b2e5ce10540f793cad3d668105435e3917c4a85e`.

Prior reported phase results are in progress: V95-02 128/128 suites, V95-03 129/129, V95-04 130/130. v9.4 predecessor was 126/126. These are historical completed gates, not new reruns or additive counts of unique scenarios. V95-05 retained all old mandatory assertions and consolidated only an excluded availability fixture; [deprecation evidence](V95_05_DEPRECATION.md) explains the distinction.

## Four-player replay and rules/agency proof

The actual final validator ran existing mandatory production-path scenarios, not a generated transcript:

- `v9-release-qualification-test` REL02: Jaxon/Choso declined and consented Duel/Three Strikes, higher-total critical comparison, two separate immediate Fear moves, withheld/owner-authored reaction, separately approved disclosure, Billy's suspended shipping investigation/private native roll/continuation and all four owner adapters. Native results unchanged after restart/replay; no fabricated apology or PC-target narrative damage.
- `v94-pvp-qualification-test`: actual NPC incoming defense/Armor workflow and autonomous selector wake-up; private native effects/retraction, no fabricated attack authority; four-owner command/turn replay and OBS21/unknown PC appearance.
- `v95-protected-narrative-test`: contextual verified NPC speech in protected and historical scenes; World Director, journals and voice keep evidence/audience checks. Raw PC prose cannot be laundered through an NPC proposal.
- `v95-autonomous-fear-test`: no-preexisting-target NPC threat establishment plus immediate native consequence; separate paired obligations, losing/tied results unchanged, native third-party interruption without synthesizing Billy's choices, unsupported route held, private publication/restart/retraction and unrelated actions preserved.
- `v95-pvp-ux-test`, damage/death/multiplayer suites: independent owner consent, Evasion, authorized reactions, Armor, vanilla lethal-risk-only death moves, four-owner FFA/teams fairness/target edges and no forced reactions. No PvP Hope or action-Critical Stress bonus; reaction Fear is not an action trigger. Generic non-PvP SRD behavior remains independently tested.
- `v95-operational-metrics-test`, D08 and publication suites: bounded private/GM-only reference-safe read-only diagnostics, provider-reported usage versus unknown, uncertain delivery not blindly reposted, no extra model execution/effect from a report.

These are **offline** adapter results, not four real Discord owners, live model quality, actual paid latency or a successfully completed pilot. Detailed FEA/UX/MET mappings remain in their phase guides/progress; no completed implementation is restarted here.

## External gate and remaining limitations

CI for these local phase commits is **NOT VERIFIED**. No push is authorized, and no GitHub action run for this exact local checkpoint has been inspected. A normal push and CI inspection require effective authorization; never merge or force-push to satisfy this gate.

PIL01–PIL12 are **NOT RUN LIVE**, as recorded in [the pilot handoff](V9_5_LIVE_PILOT.md). Separate staging Discord/API authority, four consenting owners, moderator, staging configuration, explicit budgets/latency thresholds/retention terms and an independently verified stop mechanism are missing. Estimates and token telemetry do not themselves impose a hard spending ceiling or certify billing. Real semantic quality, private delivery accessibility, latency and player command burden remain unmeasured. Production access/deployment remains separately prohibited even if staging is later approved.

**Verdict:** D08 PASS **offline**, completed V95-00–05 source offline-qualified. V95-06 **BYPASSED**, not completed or live-qualified. V96 is not blocked by these unrun external checks. No general production-readiness claim.

## Persistence, migration and rollback

No SQL migration, production database inspection, session reset, ownership transfer, character purge or receipt transformation occurred. Historical v1/v2 consent/roll history remains read-only/inert for new authority. Native outcomes, damage, Armor, death choices and immediate Fear obligations are not undone by source retraction or code rollback. Additive unknown records must stay held, never silently reinterpreted by an older version.

Under a future separately approved maintenance operation, use a validated compatible code checkpoint only; retain the current database and immutable effect/delivery receipts. Never restore an old database over new dice/resources or blindly replay uncertain output. Restore retired artifact bytes from the pinned V95-04 Git object on a review branch if audit recovery is needed; those files are not required for runtime. New private UI is default-off; disabling autonomous Fear leaves obligations due for legitimate manual handling rather than canceling them. In-memory operational counters/references reset on restart; native persisted status does not.

Before any future deployment approval: exact committed SHA/CI evidence, final same-tree release gate, reviewed rollout/rollback compatibility, private/GM permissions, feature choices, tested delivery/kill controls and explicit staging/deployment decisions. Do not start VeilKeeper automatically.
