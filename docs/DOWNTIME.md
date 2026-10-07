# Extended In-Game Mechanical Downtime — v3.5.0

Downtime represents an explicit **fictional/mechanical interval** in the campaign. It is normally resolved between active scenes/sessions, but its duration is determined by the fiction — never by how much real-world time passed between Discord messages or play sessions.

## GM opens downtime

`/vc-downtime open label:<optional>`

## Players submit projects

`/vc-downtime project type:<type> title:<title> objective:<goal> ...`

Supported project categories include recovery, investigation, crafting, ritual, relationship, income/upkeep, surveillance, research, long-term project, and other.

Each project has a countdown/progress target and visibility of Party, Character Private, or Player Private.

`/vc-downtime status` shows only projects the viewer is allowed to see.

## Resolution

The GM runs:

`/vc-downtime resolve`

Veilkeeper performs two distinct AI passes: **player-project resolution** and an **autonomous downtime world-director pass**. The project pass resolves submitted work; the director separately decides whether factions, threats, obligations, investigations, clocks, or other offscreen elements reasonably move during the represented fictional interval. Real-life elapsed time is never a trigger or input for advancement.

Both AI outputs are generated before authoritative state commit and are committed together. An API/generation failure therefore cannot leave the downtime cycle half-resolved. Veilkeeper creates safety snapshots around resolution as documented by the runtime.

Party-visible project/world results are posted to configured player surfaces. Private results are sent through the player's private GM channel/DM. Hidden movement remains GM-visible.

Downtime may advance clocks or establish consequences proportionally to fictional opportunity, but it must not punish players for taking downtime, silently rewrite mystery truth, contradict canon, or take voluntary PC actions.

See `WORLD_DIRECTOR.md` for the downtime director's authority and safety boundaries.
