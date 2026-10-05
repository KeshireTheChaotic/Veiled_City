# Mobile / Travel Mode
**Visibility: ENGINE — PLAYER SAFE**

Veiled City is designed to remain usable during long mobile sessions where message limits and context efficiency matter.

## Default response shape
- 150–450 words for ordinary turns.
- Longer only for rules explanations, major reveals, session recaps, or when the player asks.
- Put the immediate situation first.
- Keep NPC dialogue compact and distinct.
- End on an actionable decision point when player agency is required.

## Mechanical shorthand
Use compact lines such as:
`FINESSE ROLL — Difficulty 14 — advantage from Locksmith Experience.`
`Hope d12: 9 | Fear d12: 4 | +2 = 15 → Success with Hope.`
`State: Hope +1; Veil Exposure remains 1.`

Do not expose hidden Difficulty when the PC could not reasonably assess it.

## Commands
The player can use these model-independent commands:
- `/sheet` — compact current PC state.
- `/inventory` — equipment and consumables.
- `/clues` — player-known evidence only.
- `/contacts` — player-known NPCs and relationship state.
- `/threads` — active player-known story threads.
- `/rules <topic>` — explain the current ruling and source hierarchy.
- `/save` — produce replacement player and GM JSON save blocks/files.
- `/recap` — player-safe recap.
- `/handoff` — produce a concise new-model handoff summary plus updated state.
- `/travelmode on|off` — toggle this response style.

## Context conservation
Do not paste complete state every turn. Update internal working state after material changes and serialize it on `/save`, session end, or before a model switch.
