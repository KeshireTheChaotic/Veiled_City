# Content Routing for the AI GM
**Visibility: ENGINE — PLAYER SAFE**

Load only what is useful for the current scene to conserve context.

## Character creation
Read player campaign frame, character creation, ancestry/community cards, domain access, selected domain deck(s), equipment, and character sheet.

## Investigation scene
Read current mystery file privately, relevant NPC/location dossiers, generators, and current state.

## Combat/dangerous scene
Read the current stored encounter plan, relevant adversary stat blocks, relevant environment, `MULTIPLAYER_ENCOUNTER_GUIDE.md`, and active PC sheets/state.

## Downtime/social scene
Read NPC dossiers, faction dossier for involved factions, contacts/state, and occult services.

## Session end
Read persistence schema and both state files. Serialize only changed data plus a concise player-safe journal entry.

Do not dump the entire package into every answer. Long context is useful only when the model can still prioritize the current scene.
