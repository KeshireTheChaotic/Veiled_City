# Multiplayer Encounter Guide
**Visibility: ENGINE — player-readable methodology; encounter composition and BP accounting remain GM-private.**

Veiled City v3.1.3 is multiplayer-only. Combat encounter construction uses Daggerheart Battle Points based on the player characters actually present in the current Discord session.

## Battle Point budget
Start with:

`Battle Points = (3 × PCs in combat) + 2`

Then apply the standard encounter adjustments supported by Veilkeeper:
- **-1 BP** for an easier or shorter fight.
- **+2 BP** for a harder or longer fight.
- **-2 BP** when using 2 or more Solo adversaries.
- **-2 BP** if all adversaries receive +1d4 (or static +2) damage.
- **+1 BP** if any lower-tier adversary is used.
- **+1 BP** if the encounter has no Bruiser, Horde, Leader, or Solo.

Veilkeeper derives the last four modifiers from the stored encounter plan where possible.

## Adversary costs
- **1 BP:** one Minion group equal to party size; each Social or Support adversary.
- **2 BP:** each Horde, Ranged, Skulk, or Standard adversary.
- **3 BP:** each Leader.
- **4 BP:** each Bruiser.
- **5 BP:** each Solo.

A Minion entry in the encounter builder represents a party-sized group. For four PCs, one Minion group produces four Minion bodies for 1 BP.

## Live roster
Count only PCs whose players are Present, Guest, or Late-and-arrived and who have an active character assignment. Offscreen, Background, absent, retired, dead, and NPC-proxy characters do not count as PCs for the budget.

The automatic tier is the highest tier represented among present PCs:
- Tier 1: Level 1
- Tier 2: Levels 2–4
- Tier 3: Levels 5–7
- Tier 4: Levels 8–10

For significantly mixed-level groups, the human GM should review the generated plan.

## Objectives and environments
Battle Points govern opposition, not the whole scene. Every important fight should also have an objective or changing environment whenever appropriate: contain an entity, protect a witness, stop a ritual, extract evidence, hold a threshold, prevent a Veil breach, escape, or bargain under pressure.

Do not reveal BP totals, hidden reinforcements, adversary stat blocks, or unused budget to players unless the fiction gives them that information.
