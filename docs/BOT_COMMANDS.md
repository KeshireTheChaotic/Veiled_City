# Veilkeeper v3.3.0 Command Reference

Veilkeeper uses split `vc-*` root commands to remain below Discord's per-command size limit.

## Campaign
- `/vc-campaign setup` — configure play channel, GM role, response mode.
- `/vc-campaign channels` — configure support/reference/log channels.
- `/vc-campaign sync` — republish managed case/NPC/location surfaces.
- `/vc-campaign status` — show campaign/session configuration.

## Session / Party
- `/vc-session start [assembly]`
- `/vc-session present [character]`
- `/vc-session assemble`
- `/vc-session assembly-status`
- `/vc-session converged`
- `/vc-session absent mode:<offscreen|background|proxy>`
- `/vc-session arrive [character]`
- `/vc-session leave mode:<...>`
- `/vc-session end`
- `/vc-party establish [name]`
- `/vc-party status`

## Characters
- `/vc-character create`
- `/vc-character import`
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
- `/vc-canon resolve` — GM.

## Snapshots / Rollback
- `/vc-admin snapshot`
- `/vc-admin snapshots`
- `/vc-admin rollback`

## Player / Intel
- `/vc-player private-channel`
- `/vc-player accessibility`
- `/vc-intel recap`
- `/vc-intel clues`
- `/vc-intel caseboard`

## GM utilities
- `/vc-gm fear delta:<amount>`
- `/vc-gm fact`

GM/admin commands require Manage Server or the configured GM role.
