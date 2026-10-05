# Persistence Schema
**Visibility: ENGINE — PLAYER SAFE**

## Player state
`STATE/CAMPAIGN_STATE.json` may be shown to the player. It contains only discovered facts, PC mechanical state, player-known NPCs/factions/locations, active threads, debts, equipment, and session journal information.

## GM state
`GM_PRIVATE/GM_STATE.json` is AI-DM-only. It stores hidden truths, unrevealed clues, private NPC knowledge, clocks, future consequences, faction moves, mystery answers, and secret continuity constraints.

## Save rule
The newest explicit save is authoritative. Each save should increment `last_updated_session` or update the relevant session field.

## Never cross the firewall
Do not copy a GM-private field into player state simply because it influenced a scene. Transfer only the portion legitimately discovered by the PC.

## Mystery persistence
For each active mystery, GM state should record:
- fixed hidden truth,
- culprit/cause if any,
- clue list and discovery status,
- escalation clock,
- involved NPC knowledge boundaries,
- player hypotheses,
- consequences already triggered.

The hidden truth should not be rewritten to invalidate correct player reasoning unless an explicitly established shapeshifter, deception, altered evidence, or similar in-fiction mechanism justifies the change.


## Multiplayer encounter state
SQLite is authoritative for combat encounter plans. Encounter records store the live PC count used for budgeting, tier, difficulty, style, Battle Point budget, GM-private composition, objective, environment, and lifecycle status. Player-safe saves may include that an encounter occurred and its discovered objective/environment, but must not expose hidden BP math or unrevealed composition.
