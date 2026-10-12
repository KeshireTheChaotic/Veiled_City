# V95-03 — owner-private guided PvP

Starting commit: `708d0bd687f6810037ff0829a2ee19f654c79c8a`, branch `codex/typed-intent-refinement`. Only V95-03 is in scope. Supplied lean-policy amendments are retained; no V95-00–02 replay, deprecation, live registration, production access, deployment, push or model call.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Use

The optional campaign flag defaults **off**. A GM can opt in after an independently authorized deployment/command registration:

```text
/vc-city flags json:{"pvp_private_ui":true}
/vc-roll pvp-menu
/vc-roll pvp-menu reference:<exact native reference>
```

The inbox finds the current owner's accepted PC-target attempts, proposals, damage contracts and native mechanics requests. Attempts already represented by a proposal are not duplicated. The reference option opens a specific accepted intent, proposal/contract, prepared attack, damage offer, reaction, incoming NPC attack or death request. Owners need one slash command to enter a flow; subsequent steps are buttons/selects/modals, not hand-written JSON. Synthetic test duration is not a measured live-player completion time.

Review is separate from Accept. Counteroffers change the native terms hash and invalidate prior approvals. Narrative proposals can offer Duel/Three Strikes and private/bilateral-clause audience; neither profile grants damage. A damage proposal explicitly offers **vanilla lethal risk**, reciprocal target edges and owner-selected SRD death moves, never guaranteed nonlethal tiers. All affected owners must independently review/sign identical terms. Current four-player FFA/team contracts expose only signed, already natively prepared target requests and the owner's fair-opportunity/pass controls.

Narrative choices use allowed traits plus an owner-authored attempt. Roll and both-owner continuation use native windows. Own saved dice, score and the native Fear gate are shown privately without opposing sealed dice/choices. Damage attacks separately review/confirm each owner's mechanics, then the attacker rolls attack/damage. Only the affected owner reviews/spends Armor and selects/allocates a death move. Applicable reactions require an existing sourced native rule/offer; ordinary attacks never receive a free defense roll.

Native attack/damage preparation, applicability rulings, encounter activation and Blaze's final-action approval remain their existing legitimate GM/native prerequisites. The UI does **not** invent those approvals or prepare an attack from a model flag. An ordinary incoming NPC request waits for native GM dice; an already selected autonomous Fear attack resumes the existing verified coordinator after owner defense/Armor. Unsupported mechanics/Fear remain native review, not cosmetic completion. Open the inbox to locate the next supported owner request.

Winner authors only their own native success clause. Each owner may choose a supported own reaction or withhold it. Freeform text remains private `needs_scope_review`. Party projection requires separate exact-clause review and bilateral disclosure; withholding is not disclosure. No UI can ratify another PC's response.

Advanced/recovery commands remain unchanged:

```text
/vc-roll pvp json:{"op":"inbox"}
/vc-roll pvp json:{"op":"damage-inbox"}
/vc-roll pending
/vc-roll effect json:<existing owner-scoped native operation>
```

Closing a menu does not withdraw. Withdrawal is explicit and preserves committed effects. Expired/stale controls require reopening, never rerolling. Unknown/partial delivery requires reviewed native outbox recovery; no public fallback or blind resend. Dead-character historical recovery stays with existing native effect commands rather than granting live participation through a UI token.

## Authority and persistence

`pvp-menu.js` is an adapter, not a second mechanics engine. Opaque custom IDs bind an unguessable private token, action and digest; persisted bindings include guild/user/controlled character/principal, session/scene, exact reference, native source digest, role, character audience and 15-minute expiry. Every callback validates these bindings and its offered action. Native service calls revalidate consent, source, target, window and effect proofs independently. UI consumption and native operation share a transaction. Per-owner component serialization supplements, never replaces, native JSON/component idempotency.

New private operational kinds: `pvp_ui_token`, `pvp_ui_delivery`; inbox navigation uses a noncanonical `pvp_ui_checkpoint` world event solely as genuine FK ancestry, never as a player declaration, consent or effect. No schema migration. Existing `pvp_*` civic-context exclusion keeps UI records out of GM campaign-memory context. No credentials or player data are included in tests/manifests. Old native receipts/history are unchanged.

Interaction acknowledgments precede queued work. Modal opening validates synchronously before its initial response. Delivery claims are persisted before transport; delivered/delivering/uncertain identities cannot be blindly reposted. Final private sends recheck current owner/source and native review ancestry, including attachments. Renderer/transport failures occur **after** native commit, so they cannot undo damage/death or cause another RNG call. Unexpected code failures are not converted into mechanical success.

Narrative and new damage status notices reuse the existing `pvp_status_publication` native outbox, with source/owner/revision checks at materialization and delivery. `damagePvpOwnerContext()` is read-only; notification does not record Review or a signature. It discloses only the recipient's current contract reference/status and fixed lethal-risk guidance. Complete terms stay behind explicit native Review. New guidance is feature-gated; existing JSON/native services remain available when off.

Inbox scans use native pagination, with a 10,000-record per-kind safety bound that fails explicitly rather than truncating. Discord text pages are bounded to 1,400 characters plus heading; complete private text is attached. Select pages use 20 options; action pages preserve all controls within Discord's row limits.

## UX01–UX16 coverage crosswalk

All cases are in mandatory `bot/scripts/v95-pvp-ux-test.mjs`, through actual `handleCommand` slash/component/modal adapters and temporary SQLite. Native GM setup in fixtures is explicit; no production DB or fabricated result receipt.

| Case | Executable test title fragment / native boundary |
|---|---|
| UX01 | `private guided consent`; `guided new proposal`; `privately notifies both owners`; `inbox offers own accepted PC attempts` — exact accepted source, native propose/review/respond, no auto-consent |
| UX02 | `guided lethal-risk offer`; `damage invitation` — v3 propose/read-only status, independent native Review/signatures, exact risk/edges |
| UX03 | `decline is neutral` — private native decline, no dice or forced loss |
| UX04 | `target-only Armor ... then withdrawal` — native stop retains saved Armor/HP/application receipt |
| UX05 | `counteroffer invalidates old approval` — native revision, approvals cleared, stale UI denied |
| UX06 | `native Duel choice and dice`; `Three Strikes tie` — own choices, native RNG once, tied zero-score exchange and both-owner continuation |
| UX07 | `four-owner FFA`; `team-contract Review` — signed target-only request selection, native opportunity review/pass, explicit current team assignments, no target Evasion leak or forced nonparticipant roll |
| UX08 | `target-only Armor`; `incoming NPC defense review` — affected-owner native attack defenses and Armor, exact native application once |
| UX09 | `death choice persists`; `Risk It All recovery allocation and other death choices` — all three explicit native choices, allocation, failed delivery/restart, no auto-choice/reroll |
| UX10 | `only an established source-triggered reaction` plus FFA absence assertion — sourced reaction Review/roll, no universal defense, no reaction metacurrency |
| UX11 | `separate owner clauses and bilateral disclosure` — own success, withheld loser response, private unverified cross-PC draft, unchanged approved projection |
| UX12 | `complete long terms`; `navigation stays bounded`; `inbox ... 100 records` — complete attachment/paging, all 101 owned attempts, bounded terminal navigation |
| UX13 | `private response failure`; `uncertain interaction delivery`; `native terms DM partial send`; `failed modal` — durable committed outcome, actual partial chunk receipts, restart no resend/public fallback |
| UX14 | `tampering ... changed owner`; `revoked source, forged action`; `prototype getters`; `expiry and scene change`; `mechanical references from a prior scene` — current bindings at callback/transport, inert stale/foreign controls and pre-RNG acknowledgment failure |
| UX15 | `parallel slash/button` — existing native receipt wins once, stale retry uses no entropy; native notices retain idempotent identities |
| UX16 | `flag-gated`; `JSON remains available`; `legacy damage JSON`; `published PvP-menu schema` — default-off UI, working native fallback and bounded command descriptions |

## Validation and rollback

Red-first evidence: missing actual interactive controls **0/1**; repeated uncertain acknowledgment and missing guided native notices reproduced before fixes; damage invitation **0/1**; own-attempt inbox **0/1**; prior-scene mechanics menu **0/1**; final-page selection failed before clamping/navigation repair. Fixture-only mismatches (human-readable risk text, actual NPC damage die count, bilateral continuation) were corrected to match unchanged native contracts, not by weakening mechanics.

Integration checkpoint: eight affected suites (`v95-pvp-ux`, `v9-roll-ux`, `v9-discord-hardening`, `v9-publication`, `v94-pvp-profile`, `v9-pvp-authorship`, D08 security and observability) **163/163**, exit **0**, no skipped/cancelled tests. This preceded the final own-attempt inbox/presentation refinement; final qualification is recorded in the progress log, not inferred from this checkpoint.

Final gate procedure: focused UI suite; inventory refresh; `node scripts/sync-release.mjs 10.0.0`; `npm run check`; one complete network-denied `npm run validate`; `git diff --check`. REL01 makes this suite mandatory (129 rather than 128). Result-only progress/manifest accounting does not change executable/test inputs; use the lean-policy manifest integrity check without an otherwise duplicate full validation.

Rollback: set `pvp_private_ui:false`; stale callbacks are denied, JSON/native recovery remains. Keep all token/delivery, consent, dice, damage/death, Fear and publication receipts. Do not reset resources, delete imported characters, remove pending owner choices, or resend uncertain chunks. No data migration is needed. Reverting the adapter should retain or drain verified newly versioned damage notices; old builds without `pvp_damage_status` cannot render them, so disable UI and retain/hold those jobs for upgraded reviewed recovery rather than rewriting history.

Offline qualification is not a live pilot. Actual Discord registration, permission/DM behavior on a staging guild, accessibility and player-time measurement require separate authorization. No V95-04 metrics/deprecation/live staging implemented here.
