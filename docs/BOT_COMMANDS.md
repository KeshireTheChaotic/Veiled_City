# Veilkeeper v3.1.2 Command Reference

All commands live under `/vc`.

## Campaign
- `/vc campaign setup` — main `#the-table`, GM role, response policy.
- `/vc campaign channels` — set rules, case-board, journal, known-NPC, known-location, GM-log, and error channels.
- `/vc campaign sync` — republish current player-visible case/NPC/location state into configured channels.
- `/vc campaign status` — show complete channel configuration, mode, Veil Exposure, and session.

## Rules Desk
- `/vc rules ask question:<text>` — cheap, concise, player-safe rules lookup. Does not mutate campaign state.
- Ordinary rules questions typed in the configured `#rules-questions` channel use the same low-cost path.

## Session attendance & assembly
- `/vc session start assembly:<mode>` — start a session and choose convergence behavior.
- `/vc session present` — initial check-in.
- `/vc session assemble` — GM-only; generate/send private hooks and post the shared opening.
- `/vc session assembly-status` — GM-only; show mode, phase, convergence goal, and proposed links.
- `/vc session converged` — GM-only; mark immediate objectives as overlapping.
- `/vc session absent`
- `/vc session arrive` — late entry; may generate a low-cost arrival hook.
- `/vc session leave`
- `/vc session end` — also posts the recap to the configured journal.

## Persistent party
- `/vc party establish [name:<text>]` — GM-only; save present PCs as an ongoing working group.
- `/vc party status` — show persistent party members and current phase.

## Characters
- `/vc character create`
- `/vc character import`
- `/vc character list`
- `/vc character select`
- `/vc character sheet`
- `/vc character retire`
- `/vc character death`

## Guests
- `/vc guest create`
- `/vc guest claim`

## Guest-controlled NPC antagonists
- `/vc npc offer npc:<name> player:@Guest control:<level> [objective] [gm_notes]` — GM-only; generate and privately deliver a sanitized package. Guest must claim it.
- `/vc npc proxy npc:<name> player:@Guest control:<level> [objective] [gm_notes]` — GM-only; activate immediately and deliver the same package.
- `/vc npc claim npc:<name>` — accept an offered proxy.
- `/vc npc decline npc:<name>` — decline an offered proxy.
- `/vc npc status` — show active/offered assignments visible to you.
- `/vc npc packet npc:<name>` — re-send your sanitized package.
- `/vc npc release npc:<name>` — end control; assigned player or GM may release.

Control levels: `portrayal`, `tactical` (recommended), `full_npc`. See `docs/NPC_PROXY_CONTROL.md`.

## Player preferences
- `/vc player private-channel` — run inside the player's private GM channel. In v3.1 that channel becomes two-way AI GM input/output during active sessions.
- `/vc player accessibility`

## Dice
- `/vc roll duality`
- `/vc roll damage`

Dice are generated in application code, not by the language model.

## Intel
- `/vc intel recap`
- `/vc intel clues`
- `/vc intel caseboard`

## Human GM/admin
- `/vc gm fear`
- `/vc gm fact`

GM/admin tools require Manage Server or the configured GM role.


## `/vc encounter` — v3.1.3 multiplayer Battle Point builder
GM/admin only.

- `/vc encounter build` — build from the live session roster.
- `/vc encounter status` — show GM-private BP budget/composition.
- `/vc encounter adjust` — change difficulty, damage boost, or custom BP adjustment; optionally rebalance before start.
- `/vc encounter add adversary:<name> quantity:<n>` — add opposition. Minion quantity is party-sized groups.
- `/vc encounter remove adversary:<name> quantity:<n>` — remove opposition.
- `/vc encounter start` — mark the plan active.
- `/vc encounter end` — close the encounter.

The builder requires at least two present PCs. NPC Proxy antagonists remain adversaries and do not increase PC count.
