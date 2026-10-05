# Cross-Model Handoff
**Visibility: ENGINE — PLAYER SAFE**

A Veiled City campaign should be able to move from ChatGPT to Claude, Gemini, or another capable model without depending on hidden chat memory.

## Minimum handoff set
Upload or paste:
1. `ENGINE/AI_GM_CONSTITUTION.md`
2. `ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md`
3. `ENGINE/MODEL_START_PROMPT.md`
4. latest `STATE/CAMPAIGN_STATE.json`
5. latest `GM_PRIVATE/GM_STATE.json`
6. `PLAYER/PLAYER_COMPENDIUM.md`
7. `GM_PRIVATE/AI_DM_COMPENDIUM.md`

You normally do **not** need the full prior transcript.

## Handoff command
Ask the old model:

`/handoff — validate current state, update both JSON saves, then give me a player-safe recap of unresolved immediate context. Do not expose GM-private state.`

## New model validation
The new model must report only whether it successfully loaded:
- campaign/session number,
- PC name and current public mechanical state,
- current public location/situation,
- save schema versions.

It must not summarize private files as proof that it read them.

## Conflict resolution
1. newest explicit JSON save,
2. explicit player correction,
3. established campaign canon in session journal,
4. older transcript memory.

If two same-version saves conflict, ask the player which should win rather than guessing.
