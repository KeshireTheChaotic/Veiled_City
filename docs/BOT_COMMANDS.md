# Veilkeeper v3.2.4 Command Reference

Veilkeeper uses split root commands to stay within Discord's per-command size limit. The root name identifies the command family.

## Campaign
- `/vc-campaign setup` — configure `#the-table`, GM role, response mode.
- `/vc-campaign channels` — configure support/reference/log channels.
- `/vc-campaign sync` — republish bot-managed case/NPC/location surfaces.
- `/vc-campaign status` — campaign channels, Veil Exposure, Fear, session, party.

## Session and party
- `/vc-session start [assembly:<mode>]`
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

## Character lifecycle
- `/vc-character create`
- `/vc-character import`
- `/vc-character list`
- `/vc-character select`
- `/vc-character sheet`
- `/vc-character export [character] [format:<docx|json|markdown|all>]` — player-safe live export.
- `/vc-character export-gm character:<name> [format:<docx|json|markdown|all>]` — GM/Admin private export bundles.
- `/vc-character retire`
- `/vc-character death`

### AI-assisted character creation
- `/vc-character concept description:<plain English>`
- `/vc-character concept-status`
- `/vc-character concept-accept`

### Validated advancement
- `/vc-level level-up character:<name>`
- `/vc-level level-choose ...`
- `/vc-level level-confirm`

## Guests and NPC proxies
- `/vc-guest create`
- `/vc-guest claim`
- `/vc-npc offer`
- `/vc-npc proxy`
- `/vc-npc claim`
- `/vc-npc decline`
- `/vc-npc status`
- `/vc-npc packet`
- `/vc-npc release`

## Encounter building and combat state
GM/admin only.

- `/vc-encounter build`
- `/vc-encounter status`
- `/vc-encounter adjust`
- `/vc-encounter add`
- `/vc-encounter remove`
- `/vc-encounter start`
- `/vc-combat combatants`
- `/vc-combat damage`
- `/vc-combat heal`
- `/vc-combat stress`
- `/vc-combat condition`
- `/vc-combat combatant-status`
- `/vc-encounter end`

`condition` also tracks temporary effects and Vulnerable/Restrained-style states. `/vc-combat combatants` shows advisory spotlight counts and Fear.

## Dice
- `/vc-roll duality [reaction:true]`
- `/vc-roll damage dice:<expression>`

Normal Duality rolls deterministically apply Hope/Fear and, during active encounters, spotlight counts. `reaction:true` suppresses Hope/Fear and spotlight changes.

## Rules desk
- `/vc-rules ask question:<text>`
- `/vc-rules ruling key:<key> question:<question> ruling:<answer>` — GM/admin.
- `/vc-rules rulings`

Answers are labeled RAW, Veiled City House Rule, Homebrew Content, GM Ruling, or Provisional Ruling.

## Downtime
- `/vc-downtime open` — GM/admin; between sessions.
- `/vc-downtime project`
- `/vc-downtime status`
- `/vc-downtime resolve` — GM/admin.

## Canon
- `/vc-canon set` — GM/admin.
- `/vc-canon status`
- `/vc-canon conflicts` — GM/admin.
- `/vc-canon resolve` — GM/admin.

## Snapshots / rollback
- `/vc-admin snapshot`
- `/vc-admin snapshots`
- `/vc-admin rollback`

All admin commands require Manage Server or the configured GM role.

## Player preferences and intel
- `/vc-player private-channel`
- `/vc-player accessibility`
- `/vc-intel recap`
- `/vc-intel clues`
- `/vc-intel caseboard`

## GM utilities
- `/vc-gm fear delta:<+/- amount>` — deterministically changes Fear, capped 0–12.
- `/vc-gm fact`
