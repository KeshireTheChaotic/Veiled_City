# Veilkeeper v3.5.0 Command Reference

Veilkeeper uses split `vc-*` root commands to remain below Discord's per-command size limit.

## Living City (GM-only, v4.1.0+)

`/vc-city status`, `calendar`, `events`, `event`, `schedule`, `review`, and
`preview` provide the fictional calendar and sourced event index. Mutations use
typed JSON; reads return ephemeral GM-only attachments. See `LIVING_CITY.md`.

Phase B also adds `records`, `update`, `membership`, `report`, `link`, `action`,
`commitment`, `flags`, `run`, and `opportunity`. These are GM-only; institutional
review uses `review` with `kind:action`. Institutions/opportunities default off.

Phase C adds `connect`, `service`, `transmit`, and `history`; `update` accepts
property, infrastructure, routine, community, identity, reputation, weather,
personnel and history. Consequential changes use `review` with `kind:change`.

## Campaign
- `/vc-campaign setup` — configure play channel, GM role, response mode.
- `/vc-campaign channels` — configure support/reference/log channels.
- `/vc-campaign sync` — republish managed case/NPC/location surfaces.
- `/vc-campaign status` — show campaign/session configuration plus current world-director round/scene/pending state.

## Session / Party
- `/vc-session start [assembly]`
- `/vc-session present [character]`
- `/vc-session assemble`
- `/vc-session assembly-status`
- `/vc-session roster` — GM-only ephemeral player → PC/guest/proxy assignment view
- `/vc-session converged`
- `/vc-session absent mode:<offscreen|background|proxy>`
- `/vc-session arrive [character]`
- `/vc-session leave mode:<...>`
- `/vc-session end`
- `/vc-party establish [name]`
- `/vc-party status`

## Characters
- `/vc-character create`
- `/vc-character import` — player JSON; optional player-safe narrative `.md` attachment
- `/vc-character context-export [history_sessions]` — export current player-safe campaign/rules context for external AI character creation
- `/vc-character import-gm-hooks file:<json> [character] [narrative:<md>]` — **GM/Admin** import reviewed GM-only hook proposals plus optional GM-private narrative
- `/vc-character narrative-import character:<name> scope:<player|gm_private> file:<md>` — import/update supplemental Markdown; GM permission required for `gm_private`
- `/vc-character narrative-export [character] [scope:<player|gm_private|all>]` — export a ZIP using the standard `PLAYER/PLAYERS` / `GM_PRIVATE/PLAYERS` paths
- `/vc-character list`
- `/vc-character select`
- `/vc-character sheet`
- `/vc-character export [character] [format]`
- `/vc-character export-gm character:<name> [format]`
- `/vc-character retire`
- `/vc-character death`

`/vc-character concept` was removed in v3.3.0. Use create/import with a prepared player character package.

## Advancement
- `/vc-level level-up character:<name>`
- `/vc-level level-choose ...`
- `/vc-level level-confirm`

## Guests / NPC proxies
- `/vc-guest create`
- `/vc-guest claim`
- `/vc-npc offer`
- `/vc-npc proxy`
- `/vc-npc claim`
- `/vc-npc decline`
- `/vc-npc status`
- `/vc-npc packet`
- `/vc-npc release`

## Encounters / Combat
GM/admin encounter-building controls:
- `/vc-encounter build`
- `/vc-encounter status`
- `/vc-encounter adjust`
- `/vc-encounter add`
- `/vc-encounter remove`
- `/vc-encounter start`
- `/vc-encounter end [aftermath:<auto|confirm|none>]`
- `/vc-encounter aftermath-status`
- `/vc-encounter aftermath-confirm`
- `/vc-encounter aftermath-discard`

Combat-state controls:
- `/vc-combat combatants`
- `/vc-combat damage`
- `/vc-combat heal`
- `/vc-combat stress`
- `/vc-combat condition`
- `/vc-combat combatant-status`

## Handouts / Evidence
- `/vc-handout list` — list evidence visible to you.
- `/vc-handout show` — show a visible artifact.
- `/vc-handout export` — download JSON/Markdown/DOCX/all.
- `/vc-handout generate` — GM: create from established facts using low-cost AI.
- `/vc-handout create` — GM: store supplied artifact text with no AI call.
- `/vc-handout deliver` — GM: redeliver an artifact.
- `/vc-handout archive` — GM: archive an artifact.

## Relationships
- `/vc-relationship list`
- `/vc-relationship set` — GM.
- `/vc-relationship adjust` — GM.
- `/vc-relationship import-hooks [character]` — GM; one-time backfill for pre-v3.3.0 PCs.

## Dice
- `/vc-roll duality [reaction:true]`
- `/vc-roll damage dice:<expression>`

## Rules
- `/vc-rules ask question:<text>`
- `/vc-rules ruling ...` — GM authoritative campaign ruling.
- `/vc-rules rulings`

## Downtime
- `/vc-downtime open` — GM.
- `/vc-downtime project`
- `/vc-downtime status`
- `/vc-downtime resolve` — GM.

## Canon
- `/vc-canon set` — GM.
- `/vc-canon status`
- `/vc-canon conflicts` — GM.
- `/vc-canon proposals [status] [character]` — GM; review pending imported or private-player canon proposals.
- `/vc-canon proposal-resolve` — GM; accept, reject, or accept an edited proposal value. Private-player proposals use the same review gate.
- `/vc-canon resolve` — GM; resolving a conflict linked to an imported proposal also updates the proposal automatically.

## Snapshots / Rollback
- `/vc-admin snapshot`
- `/vc-admin snapshots`
- `/vc-admin rollback`
- `/vc-admin backup`
- `/vc-admin backups`
- `/vc-admin restore-preview`
- `/vc-admin restore`
- `/vc-admin doctor`
- `/vc-admin seed-data` — GM-only, privacy-aware import of all GM/GM_PRIVATE/PLAYER files; add-only runtime bootstrap and safety snapshot (see `CONTENT_SEEDING.md`)
- `/vc-admin ledger`

## Player / Intel
- `/vc-player private-channel`
- `/vc-player accessibility`
- `/vc-intel recap`
- `/vc-intel clues`
- `/vc-intel facts`
- `/vc-intel caseboard`

## GM utilities
- `/vc-gm fear delta:<amount>`
- `/vc-gm fact-add`
- `/vc-gm fact-list`
- `/vc-gm fact-edit`
- `/vc-gm fact-archive`
- `/vc-gm fact-promote`
- `/vc-gm overview`
- `/vc-gm npc-state npc:<name-or-key>` — inspect GM-private NPC profile, memories, beliefs, and goals

World Director operations:
- `/vc-director status`
- `/vc-director history`
- `/vc-director pause`
- `/vc-director resume`
- `/vc-director run`

GM/admin commands require Manage Server or the configured GM role.


## `/vc-voice` — Discord narration

- `/vc-voice join` — join the requesting player’s current voice channel
- `/vc-voice status` — show enablement, channel, model, voice, queue, and FFmpeg state
- `/vc-voice repeat` — replay the most recent cached narration without another TTS request
- `/vc-voice leave` — GM/Admin disconnect
- `/vc-voice pause` / `/vc-voice resume` — GM/Admin playback control
- `/vc-voice configure [mode] [voice] [speed] [instructions]` — GM/Admin runtime voice settings
- `/vc-voice narrate text:<text>` — GM/Admin one-off AI narration

Voice narration is non-authoritative; the text message remains the campaign record. See `VOICE_NARRATION.md`.
