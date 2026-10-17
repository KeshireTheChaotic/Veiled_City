# Command map — configured Discord bot

**Contract:** actual command declarations and permission checks in `bot/src/command-definitions.js` and `commands.js` are authoritative; this is a concise operational index, not an exhaustive option schema. Run `npm run register` from `bot/` after changes and use Discord's option picker for required arguments. Most native mutating controls demand the owning user, GM role, or Manage Server as appropriate.

| Root | Key operations | Audience/authority |
| --- | --- | --- |
| `/vc-campaign` | `setup`, `channels`, `status`, `sync` | GM/admin for configuration |
| `/vc-session` | `start`, `present`, `roster`, `assembly-status`, `assemble`, `converged`, `arrive`, `absent`, `leave`, `end` | Owners for attendance; GM for assembly/status operations |
| `/vc-party` | `establish`, `status` | Voluntary party state |
| `/vc-character` | `create`, `import`, `describe`, `import-gm-hooks`, `narrative-import`, `narrative-export`, `context-export`, `sheet`, `select`, `export`, `death` | Owner/GM scoped; GM hook import is private |
| `/vc-level` | `level-up`, `level-choose`, `level-confirm` | Owner advancement |
| `/vc-player` | `private-channel`, `accessibility` | Owner/recipient preferences |
| `/vc-roll` | `pending`, `menu`, `result`, `duality`, `damage`, `contribute`, `adjudicate`, `effect`, `window`, `pvp`, `pvp-menu` | Player dice/options are authenticated; GM cannot execute PC dice |
| `/vc-encounter`, `/vc-combat` | encounter build/start/end/aftermath; combatant state/damage/heal/stress/conditions | Native encounter and GM controls |
| `/vc-rules` | `ask`, `ruling`, `rulings` | Rules desk read; GM ruling save |
| `/vc-story` | `context`, `diagnose`, `conversation`, `delegation`, `ai-inbox`, `expansion-status`, authoring and other scoped operations | GM/private where indicated; delegation policy is separate from GM creative discretion |
| `/vc-city` | `status`, `flags`, `records`, `review`, `scene`, `scene-view`, civic/institution controls | GM operations, explicit policy/authority |
| `/vc-director` | `status`, `history`, `pause`, `resume`, `run` | GM fictional-time Director controls |
| `/vc-gm`, `/vc-admin` | overview, facts, NPC state; doctor, seed-data, snapshots/backups/rollback/ledger | GM/admin only; recovery requires care |
| `/vc-intel`, `/vc-handout` | entitled evidence, caseboards, recaps, artifacts | Player-visibility bounded; handout creation/review GM-controlled |
| `/vc-canon`, `/vc-downtime`, `/vc-relationship` | proposals/resolution, projects, relationship review | Native owner/GM boundaries |
| `/vc-voice` | `join`, `status`, `configure`, `pause`, `resume`, `repeat`, `leave`, `narrate` | Optional voice; text/receipts remain authoritative |

## Current native reaction controls

The existing `/vc-roll window json` endpoint includes `gm-reaction-inbox`, `gm-reaction-review`, `gm-reaction-roll`, `gm-reaction-withdraw`, and exact `gm-reaction-choice` for qualified group features. For example, `gm-reaction-review` only inspects the player's **own** current native decision; rolling or selecting a resource choice requires a separate authenticated input and current revision. Never paste an invented revision or another PC's request key. `/vc-roll effect json` controls incoming NPC attack reviews and owner-specific defense/Armor/withholding as provided by the current private UI.

## Common first-session operations

```text
/vc-campaign setup play_channel:#the-table gm_role:@GM mode:assisted
/vc-admin doctor
/vc-admin seed-data
/vc-session start title:Opening Night assembly:auto
/vc-session present character:<your own character>
/vc-session assembly-status
/vc-session assemble
```

Only the first, doctor, seed, start, assembly-status and assemble actions above belong to the GM/admin. Players initiate their own `present` command; use the actual picker for placeholder values.

## Authorization note

AI prose is not a slash-command principal. An AI-generated intent cannot supply an authenticated owner, independently grant a feature execution handler, spend another player's Hope, repair uncertain delivery, or change administrative flags.
