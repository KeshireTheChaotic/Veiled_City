# Session assembly and character-specific openings

Veilkeeper distinguishes campaign membership, session attendance, fictional presence and voluntary party affiliation. Checking in **does not** move a PC into a room, establish co-location or consent to cooperate.

## First-session sequence

1. GM: `/vc-session start title:Opening Night assembly:auto` (or an explicit supported assembly mode). Native start schedules one opening automatically, including a zero-attendee camera opening; pre-start attendance is carried forward.
2. Players: `/vc-session present character:<owned name>` and register an isolated private channel using `/vc-player private-channel`.
3. GM: inspect `/vc-session roster` and `/vc-session assembly-status`. `/vc-session assemble` is inspection/recovery, not a required startup ritual.
4. Native assembly plans identify current attended PCs, owner-entitled character hooks and a separately publishable shared camera; a GM-only planning idea is not an established fact.
5. Each recipient may receive a **specific personal thread**. The shared opening must not invent that another PC chose to arrive, speak, surrender or disclose a secret.
6. `/vc-session converged` records overlapping immediate objectives when established; `/vc-party establish` is a later **voluntary** choice.

Supported start modes include `auto`, `already_together`, `shared_incident`, `common_client`, `crossed_cases`, `mutual_threat`, `faction_summons`, `chain_contacts`, `rescue`, `debt_favor`, and `manual`.

## Assembly publication contract

- `assembly_hook` is a source-based player-entitled personal thread, **not** a newly resolved PC act.
- Expressive public/private scene writing uses isolated writer context and the existing native output-parts authorization. The dedicated, source-bound assembly stage can operate for a current v2 plan even when ordinary scene-description flags are off. It does not globally enable spontaneous NPC/effect creation.
- Current plan freshness fingerprints roster/principals/position/sources, imported hook/narrative revisions, relevant facts/canon and party state. A changed dependency invalidates an undelivered plan.
- The publisher distinguishes `SOURCE_HOOK_DELIVERED`, `VERIFIED_SCENE_DELIVERED`, `FALLBACK_DELIVERED`, review/blocked/uncertain, and acknowledged legacy states. An acknowledged fallback is **not** retroactive proof that a personal story was delivered.
- Private text is checked again against source, ownership, audience, plan, scene, recipient and body at delivery/restart. Unknown sends remain uncertain; no resend by guesswork.

## GM recovery for a stale or fallback opening

1. Use `/vc-session assembly-status` and the GM-only assembly response for actual saved status.
2. When offered and appropriate, select **Prepare NEW sourced openings (no send)**. This schedules an explicit reviewed replacement; it does not automatically resend acknowledged messages.
3. Run `/vc-session assemble` again after preparation. New valid threads supplement previously acknowledged orientation, subject to current source checks.
4. If delivery is **uncertain**, inspect the exact Discord destination and use scope-specific reconciliation. Do not click "not delivered" unless that exact unacknowledged material was verified unsent.

### Native OpeningDirector replacement boundary

An authenticated GM may prepare **one** explicit replacement for the original native attempt. The review binds the current sources, roster, principals, full saved delivery/recipient state and original opening proof. Clicking preparation calls the planner but sends nothing and changes no dice or character resources; the next assemble runs the current source-verified publication path. A source change during planning rejects the replacement.

Unchanged acknowledged personal threads retain their original messages and turn proofs. A source-changed personal thread may be newly delivered only after that explicit review. Old unsent output never acquires the new attempt's authority. Uncertain or in-progress sends prevent replacement; legacy partial history remains on its exact-part reconciliation path. Review forwarding, revoked sources and stale sibling buttons cannot authorize another planner call. An interrupted active planning lease stays held for inspection, not an automatic provider retry.

After the replacement attempt, further source changes require scoped operator review; there is no third automatic replacement. These are operational receipts, not permission for unverified prose, forced PC actions or disclosure of GM-private hook answers. The feature does not reset imported characters or established campaign outcomes.

Legacy raw private hooks or freeform planner paragraphs are not automatically safe for publication. GM-only material cannot be converted into player knowledge because it sounds plausible. If a character lacks an entitled source, the correct result may be a truthful orientation/fallback plus a request for player-safe input.

## Late arrivals and proxies

Use `/vc-session arrive` for a late PC; placement must use the current native location/access mechanism. Use explicit absence/proxy commands to establish authorized control. Optional scene hooks never override an active human proxy or create another owner's action. Review [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).
