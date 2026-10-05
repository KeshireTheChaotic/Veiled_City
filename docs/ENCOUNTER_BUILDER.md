# Veilkeeper v3.1.3 Encounter Builder

v3.1.3 drops the legacy solo encounter model. Combat construction is multiplayer-only and uses Daggerheart Battle Points from the live session roster.

## Build an encounter

```text
/vc-encounter build difficulty:standard tier:auto style:balanced
```

Optional fields:
- `objective` — player-facing scene objective.
- `environment` — name of a Veiled City environment. If omitted, Veilkeeper chooses a tier-appropriate environment.

`tier:auto` uses the highest tier among PCs who are actually Present/Guest/Late-and-arrived.

### Styles
- `balanced` — mixed opposition.
- `boss` — prioritizes a Solo/Leader centerpiece.
- `swarm` — favors Hordes and Minion pressure.
- `strike_team` — coordinated professional opposition.
- `hunt` — favors mobile/skirmishing pressure.

## Battle Point math

Base budget:

`(3 × present PCs) + 2`

Difficulty:
- Easy / shorter: `-1 BP`
- Standard: `+0 BP`
- Hard / longer: `+2 BP`

Veilkeeper also derives official composition modifiers:
- `-2 BP` for 2+ Solos.
- `-2 BP` when `boost_damage:true` applies +1d4/static +2 damage to all adversaries.
- `+1 BP` if a lower-tier adversary is present.
- `+1 BP` if no Bruiser/Horde/Leader/Solo is present.

Adversary costs:
- 1 BP: one party-sized Minion group; each Social/Support.
- 2 BP: Horde/Ranged/Skulk/Standard.
- 3 BP: Leader.
- 4 BP: Bruiser.
- 5 BP: Solo.

## GM workflow

```text
/vc-encounter build
/vc-encounter status
/vc-encounter adjust
/vc-encounter add
/vc-encounter remove
/vc-encounter start
/vc-encounter end
```

`status` is GM-only and reveals BP math and hidden composition.

`adjust` can change difficulty, enable the global damage boost, apply a custom BP delta, and optionally rebalance a planned encounter.

`add`/`remove` let the GM edit composition directly. For Minions, quantity means **party-sized groups**, not individual bodies.

## Player-count rules
Count only active player characters currently in the combat scene. Offscreen/background/absent PCs do not count. Human-controlled NPC antagonists through NPC Proxy remain adversaries, not PCs.

Late arrivals affect subsequent encounter builds. Do not rebuild an encounter already in progress merely because attendance changes unless the fiction and GM explicitly call for it.

## Objectives
Battle Points measure opposition, not the entire scene. Prefer an objective beyond simple attrition: stop a ritual, protect a witness, seize evidence, contain an entity, hold a threshold, escape a lockdown, prevent a Veil breach, or complete an extraction.
