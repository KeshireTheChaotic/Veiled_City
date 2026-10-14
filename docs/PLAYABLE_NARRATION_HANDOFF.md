# Playable narration repair — offline handoff

Feature branch: `codex/playable-narration-repair`; base `120dccdd067700b3dcac7ff97e876b203420cb5b`; application stays **10.0.0**.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Scope and boundaries

This is a generic narration pipeline, not a laundromat patch. Exploration, accessible investigation, social settings, established supernatural observations, transitions and ongoing scene development use audience-scoped scene packets. NPC conversations retain the existing isolated NPC authoring lane. Combat, consequential supernatural capabilities, PvP, damage, custody and consent retain existing native services and receipt projections. New broad environmental prose is **not** permitted in active encounters, protected PvP or contested windows; those scopes keep their strict native/NPC narrative lanes. This does not grant a new effect adapter or turn narration into a rules ruling.

Ordinary local layout, sensory details, harmless props and ambient activity can be GM-authored even when no environmental grammar facts exist. The exact authenticated request, native place function (when provided), viewpoint, visible evidence, NPC presence and committed local details form the isolated packet. Raw combined-GM narration, sheets, private hooks and unfiltered transcripts are excluded. Model fields cannot supply authority or certify safety. New detail text is bound to the actual description span; external observations require native source IDs.

New fiction commits through `scene_fiction`, `native_scene_fiction` and `scene_local_detail` records in the existing authoritative transaction. Drafts/holds remain GM-private. Scene-local fiction is not global canon, mechanical evidence or an NPC's knowledge; promotion requires the existing native workflow. Delivery, replay, archives, recap and voice use the same source/owner/audience proof. Source revocation holds stale output without reversing committed mechanics. Audit timestamps do not masquerade as authority revisions.

**Residual risk:** these controls establish origin, scope, audience, permitted categories and native effects, not universal understanding of generated English. An indirect assertion or contradictory paraphrase with a new detail ID may evade finite tripwires. The isolated writer remains a generative GM-authorship trust boundary authorized by the owner, not a semantic safety theorem. Fake providers establish plumbing and tested contrasts, not live literary quality. No live quality, latency, token-saving or cost claim is made.

Context remains deliberately bounded: up to eight visible observations from the recent native fact inventory, six visible NPC summaries and the bounded current-scene local-detail inventory. This is not exhaustive campaign-history recall. Older evidence may require the existing native recall/retrieval pathway. Missing canonical place-function metadata remains unknown, rather than being inferred mechanically from a name. A current authenticated owner and legitimate native viewpoint are required; this is not an omniscient or unattended GM publication bypass. Live campaign-scale retrieval and unrestricted prose quality remain unqualified.

## Enable / disable (instructions only; not executed)

After separately authorized staging/deployment and offline qualification, a GM can opt in using the existing command:

```text
/vc-city flags json:{"playable_narration":true,"scene_continuity":true}
```

No command registration or SQL migration is introduced. Existing characters need legitimate native initial placement; check-in is not movement or shared presence. Established placement is necessary for a viewpoint, not for compelling an action. Private hooks are delivered only when independently authorized, never by republishing raw assembly-plan prose.

Rollback the new behavior using:

```text
/vc-city flags json:{"playable_narration":false}
```

Disabling holds queued new-fiction parts, rather than blindly sending them under the old policy. Preserve all drafts, native receipts, delivery acknowledgments and uncertain messages. Do not delete/replay campaign history, reset characters, regenerate acknowledged assembly openings or force resend uncertain deliveries. Code rollback may revert the isolated feature commits in reverse order on a review branch; preserve campaign data and native outcomes. No schema migration is required for these generic records.

## Request budget and diagnostics

Complete admitted read-only observation turns use one isolated writer request and zero engagement-router requests. Other natural-language forms retain the existing combined semantic GM path; they do not require command phrases. Mixed/action turns never use the read-only shortcut. Full action turns can use one conditional scene **or** NPC writer under the shared durable budget. Movement destination packets come from the real rollback-only native resolver, not model-asserted arrival. A malformed or unavailable writer is held without a second evaluator/retry loop. Independent native results remain publishable.

Existing bounded aggregate metrics add `scene_observation_route`, `scene_writer` and `scene_fiction_hold`. Provider request counts/reported usage retain their actual or unknown values. Review-only responses do not count as substantive publication. Hold counters include preparation/preview attempts, not unique committed turns. GM-private `scene_fiction_hold` records explain scoped review without leaking drafts into public telemetry.

## Separately authorized canary (not performed)

1. Use a disposable staging campaign, opt in explicitly, and record the exact qualified commit. Do not copy production secrets or private logs.
2. Confirm native placement; test at most six turns: sparse scene; interior description; current visible situation; authorized adjacent entry; focused follow-up; mundane investigation of already-visible evidence. Use a second location type as well as the representative laundromat.
3. Check that at least two specific physical details are useful, repeated layout is consistent, current cues survive, and actual movement has an arrival receipt plus destination description.
4. Inspect entitled private delivery separately; verify no private origin/hook or other PC reaction appears in party output or voice. Use the existing native combat/PvP controls for effects; never treat prose as consent.
5. Compare actual request/usage counts and receive-to-substantive-delivery metrics. Do not infer live savings from synthetic timings. A failed prose boundary requires scoped review, not forced publication.
6. Verify restart, uncertain-send reconciliation and rollback before broader rollout. No billable provider or Discord canary is authorized or performed by this implementation task.

## Validation ledger

All Phases 0–5 are complete locally; live canary/deployment is **not performed or authorized**. See [contract and phase evidence](PLAYABLE_NARRATION_CONTRACT.md).

| Phase | Local commit / evidence |
| --- | --- |
| 0 — contracts/red reproduction | `efa8160e89405646a1b3ff00ed3ebd3e183da1af` |
| 1 — audience-scoped packet | `a81117d707c843a77dfec5b8be9a9f6472da28fb` |
| 2 — native fiction/output | `5d4eb18d9e150a242e4370a20ec1786b433ffe2e` |
| 3 — entry/situation/assembly | `4cbd23e054f73467138e851e7d404cc07acb88bc` |
| 4 — one-call observation | `5177ac66dbf9f1d34758c5a4e14ecd238316b5d9` |
| 5 — final integration | Commit containing this report; ending SHA is provided in the implementation response and local Git log. |

Final commands actually executed: release manifest synchronization; `npm run check` (363 syntax-checked modules/scripts, 24 command schemas); **one complete** `npm run validate` (**154/154 suites**, zero failures/not-run, **488,384 ms**); `git diff --check`. Both D08 gates passed in that full run. The compact local ignored report is `bot/.reports/offline-validation.json`; no successful verbose logs were copied into source control. Affected protected-output batch: **120/120 tests**, zero skips/failures. New suite: **15/15 top-level scenarios**, with multiple independent fixture variations; registered without removing existing coverage.

The original focused baseline was **1/4 passing**, three expected missing-feature failures. No historical full-suite pass is claimed as a newly executed baseline. Static registry changed from 153 to 154 suites. Real provider requests **0**, billable tokens **0**. Eligible observation fixtures: **one writer + zero router requests**. Successful combined/native movement/NPC fixtures: **one combined + one conditional writer**; existing bounded correction may add combined requests, never additional isolated writers. Independent pending Director work is outside that observation-path count. Malformed direct authoring holds after one request. Synthetic durations are not live performance measurements.
