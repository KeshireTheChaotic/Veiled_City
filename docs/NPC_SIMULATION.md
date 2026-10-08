# Persistent campaign simulation

The existing v3.8 NPC cognition layer remains the foundation. NPC and faction
knowledge is subjective; neither a rumor nor an autonomous action silently
rewrites objective campaign truth. Models propose typed intents. The application
checks goals, knowledge, personality, location, resources and human approval,
then generates the mechanical result and commits state before publishing hooks.

## Starting and inspecting the simulation

Run `/vc-admin seed-data` to import packaged content and bootstrap missing NPC
cognition. Existing NPC seed markers are supported. Existing databases migrate on startup, preserving thread
IDs and existing NPC state. New simulation tables and memory metadata are
included in logical backups and GM-full exports. Player-safe exports exclude
them. Existing relationships are bootstrapped into directional dimensions.

Run `npm run register` after deployment to register `/vc-sim` and the optional
`minutes` argument on `/vc-downtime resolve`. All `/vc-sim` commands are GM-only,
including reads; their attached JSON reports contain GM-private information.

| Command | Purpose |
| --- | --- |
| `/vc-sim status` | Clock, entity state, pending/deferred actions, scheduled actions and queued hooks |
| `/vc-sim records kind:<kind> status:<optional>` | Inspect action, cycle, memory, goal, obligation, rumor, awareness, residue or hook records |
| `/vc-sim entity type:<npc/faction/location> key:<key>` | Inspect an entity |
| `/vc-sim entity ... json:<object>` | Configure finite resources, position, traits, personality, voice or location state |
| `/vc-sim update json:<object>` | Record an established typed simulation update |
| `/vc-sim action json:<object>` | Submit an action through the normal mechanics and review boundaries |
| `/vc-sim review action_id:<id/prefix> decision:<approve/modify/defer/reject> json:<optional>` | Resolve a consequential action; modification accepts replacement intent fields |
| `/vc-sim advance minutes:<integer>` | Explicitly advance fictional minutes and resolve due actions |
| `/vc-sim share json:<object>` | Share already-known information with source provenance |
| `/vc-sim publish` | Retry undelivered player-facing hooks |

NPC and faction keys are normalized slugs such as `mara-voss` and
`lantern-office`. Location keys must match the campaign's established keys.
`/vc-gm overview` includes pending, deferred and scheduled NPC action counts.

For example, configure Mara's location and activity with:

```text
/vc-sim entity type:npc key:mara-voss json:{"activity_tier":"active","location_key":"hollow-street"}
```

NPC/faction resources are `influence`, `materials`, `information`, `manpower`,
`leverage`, `wounds`, `stress`, and `favors`. Values are integers from 0 to 100.
Initial budgets are finite: 4 influence, 4 materials, 2 information, 2 manpower,
1 leverage, and zero wounds/stress/favors. They do not regenerate on a timer.
The GM can change budgets explicitly; recruit/acquire actions can replenish
manpower/materials by spending influence. `preparation`, `position` and `traits`
are bounded bonuses from 0 to 5. Wounds and stress reduce mechanical effectiveness.

## Fictional opportunities and action budgets

The NPC Director runs beneath public round/scene World Director opportunities
and completed mechanical downtime. A stable cycle key prevents replaying an
action cycle after a model or output failure. NPC actions, rolls, resource costs,
memories and hooks are persisted together. Downtime commits its NPC cycle in
the same transaction as project/world consequences.

Each cycle considers at most eight actors and allows at most one action per
actor. The total budget is one action at a round opportunity, three at a scene
transition, and four during downtime. Active actors are eligible generally;
supporting actors need an agenda/location intersection, except during downtime;
background actors are eligible during downtime; dormant or removed actors do
not act. Goals with incomplete dependencies are ineligible.

Available types are investigate, travel, contact, recruit, observe, prepare,
hide, acquire, spend_resource, threaten, negotiate, attack, protect, repair,
sabotage, research, spread_rumor, suppress_rumor, verify_rumor, weaponize_rumor,
request_favor, fulfill_obligation, betray, and advance_project.

Actions require an active goal. They spend one unit of their relevant resource.
An opposed d20 result adds bounded resources, preparation, position and traits,
less wounds/stress penalties. The application supplies the dice; the model
cannot choose a winner. Routine attacks cause bounded wounds; routine sabotage
causes minor location damage. Actions cannot choose PC behavior or resolve
attacks against PCs. Covert observation does not automatically inform its target.

An action input can be as small as this established-goal preparation:

```json
{
  "actor_type": "npc",
  "actor_key": "mara-voss",
  "type": "prepare",
  "goal_key": "seed.primary",
  "location_key": "hollow-street",
  "rationale": "Prepare to pursue the existing agenda."
}
```

Optional fields include target_type, target_key, information_key, hypothesis, rumor_id,
obligation_id, delay_ticks, delay_minutes, significance, public_hook and
private_user_id. Physical investigation, observation, repair and sabotage
require the actor to have reached the specified location. Information-driven
actions cannot cite an information key unknown to the acting NPC/faction.

## Delays and human review

`delay_ticks` counts fictional director opportunities; `delay_minutes` counts
explicitly advanced fictional minutes. If both are set, both must be reached.
One fictional day is 1440 minutes. Merely leaving the bot online advances neither.
Scene/round opportunities do not assume an elapsed number of minutes.
`/vc-downtime resolve minutes:1440` explicitly supplies a day; omitting minutes
does not invent a duration. Pausing the World Director suspends automatic NPC
cycles. A GM may still explicitly advance time through `/vc-sim advance`.

Actions marked major_npc_removal, major_location_destruction,
faction_transformation, campaign_secret or supernatural_disaster remain pending
until human review. No resource is spent and no consequence occurs while
pending. Approval preserves normal resource/personality checks and mechanical
uncertainty. Modification can change intent fields and delays. Deferral keeps
the action inactive until another review; rejection is terminal. The review
and reviewing GM are recorded in provenance. Approved outcomes can remove an
NPC from eligibility, mark a major location destroyed, change faction policy,
record a supernatural disaster, or disclose already-known information as a
report/clue; they do not silently turn subjective beliefs into canon.

## Typed simulation updates

An update has `kind`, `actor_type`, `actor_key`, `key`, `content`, `status`,
`source_type`, `confidence`, `importance`, and `data_json`. GM commands may omit
confidence/importance to use defaults. `data_json` is an encoded JSON object.
Ordinary turns emit no update when nothing significant occurred. Global
simulation updates from private player scenes are blocked; NPC subjective
cognition and player-scoped facts remain available through their existing paths.

| Kind | Meaning of key and data |
| --- | --- |
| voice | NPC actor; separate address, formality, humor, verbal habits, emotional tells, boundaries and mannerisms |
| location | Location key; wards, entrances, rituals, contamination, police attention, control, witnesses, hazards and incidents |
| residue | Location key; all ten arrays: participants, actions, witnesses, evidence, traces, casualties, damage, exposure, threats, escaped |
| obligation | Existing record ID or empty; debtor/creditor as `type:key`, explicit terms in content, and transfer recipient when applicable |
| rumor | Subject key; content becomes a rumor held initially by its source actor, with origin, distortion and credibility |
| awareness | Information key; actor learned content through a recorded source |
| faction_memory | Faction actor; subjective organizational memory |
| faction_goal | Existing goal record ID or empty; objective in content and priority/progress/horizon/dependencies/acceptable_methods in data |
| reconcile_memory | Original NPC memory ID; challenged or superseded status and new evidence/correction in content |

For example, an explicitly established favor is recorded with:

```json
{
  "kind": "obligation",
  "actor_type": "npc",
  "actor_key": "mara-voss",
  "content": "Mara promised Mercer one Lantern file in exchange for returning the seal.",
  "status": "active",
  "data_json": "{\"debtor\":\"npc:mara-voss\",\"creditor\":\"character:CHARACTER_ID\"}"
}
```

Obligations can be fulfilled, violated, transferred, called in, or forgiven.
Transfer updates the debtor and retains history; calling in keeps an active
obligation with a called_in lifecycle. Ordinary courtesy never creates a debt.
`fulfill_obligation` requires the debtor's active obligation ID.

## Knowledge, memory and discoveries

Episodic, semantic, relational and secret memories retain subject, importance,
confidence, sentiment, source, visibility, session/scene, fictional creation tick,
recall metadata and supersession. Retrieval also weighs current goals and
emotional salience. Minor details fade by fictional opportunities, not wall
clock. Major memories decay slowly. Relevance is evaluated before the memory
candidate limit so older relevant memories can displace unrelated recent ones.

Changed NPC beliefs preserve previous interpretations as historical memories.
Reconciliation challenges or supersedes an old memory rather than deleting it.
Reports distinguish witnessed, told_by_npc, faction_report, rumor, document and
supernatural_impression. Hearsay receives limited confidence. A claim that an
NPC does not know something remains an explicit boundary.

Scene exits require a structured residue packet from the GM model. Discoverable
evidence contains physical evidence actually left behind, not private memories
or global GM facts. NPC investigations can acquire that evidence as subjective
knowledge without making it player knowledge. `/vc-sim share` can subsequently
deliver a report to an NPC, faction or PC, with awareness and provenance. For a
PC it creates character-private knowledge, never a party-wide disclosure.
Investigations also maintain GM-private case threads. An investigative hypothesis
can become a suspected NPC belief when supported by known information or acquired
evidence; it may be wrong and never becomes objective truth automatically.

Rumors retain origin, holders, subject, credibility and distortion. Propagation
adds holders and uncertainty; suppression reduces credibility. Verification
records investigation, not automatic truth. Weaponization is a distinct action.
Factions have their own memory, awareness, policy, goals and resource budgets.

Directional relationships retain separate trust, affection, fear, respect,
debt and suspicion dimensions plus an aggregate summary. Milestones include
acquaintance, ally, trusted, suspicious, debtor, rival, enemy and romantic
interest. Opposing dimensions can coexist; milestone history remains durable.

## Returning consequences to play

Successful actions can queue a brief public or private hook: a caller, knock,
summons, waiting NPC, report, favor request or changed location. Hooks are the
only simulation packets sent through automatic player publication; internal
plans, resources and memories stay GM-private. A private hook requires a known
campaign player. Failed delivery preserves the ready hook for `/vc-sim publish`.
NPC-to-NPC consequences can remain entirely offscreen until an appropriate hook.

## Suggestion coverage

This maps the numbered recommendations in SUGGESTION.md to the implementation.
The original memory/knowledge/goal foundation was retained rather than duplicated.

| Items | Implementation |
| --- | --- |
| 1, 3, 4, 5 | Existing structured NPC cognition and mandatory review; extended provenance and automatic simulation memories |
| 2, 24, 25, 26 | Fictional-time salience, reinforcement, emotional/goal relevance, historical belief reconciliation, report sources and bounded retrieval |
| 6, 7, 8 | Dedicated NPC Director, eligible activity tiers, per-cycle budgets and machine-readable action categories |
| 9, 10 | Durable fictional delays, explicit clock advancement, finite resources and condition penalties |
| 11, 29 | Directional relationship dimensions, aggregate scores and durable milestones |
| 12 | Explicit promise/debt/favor lifecycle and decision context |
| 13, 14 | Awareness graph, source-controlled information transfer and subjective rumor propagation/suppression/verification/weaponization |
| 15, 16, 17 | Faction memory/agendas/policy/resources, persistent location state and structured scene residue |
| 18, 19, 20 | Independent NPC investigations, offscreen interactions and application-generated opposed mechanics |
| 21, 27, 28 | Existing immediate/near/long goals; personality enforcement, lawfulness/collateral limits and separate persistent voice |
| 22, 23 | Consequential-action approval queue, modify/defer/reject controls and GM overview counts |
| 30 | Durable player-facing initiative hooks through the established publication/privacy boundary |

Validation: `npm run validate` includes audit and simulation regressions. Live
Discord delivery and model narration quality still require deployment testing;
offline regressions use deterministic model responses and application-generated
test dice, without spending API credits.
