# Between-Session Downtime — v3.2.0

Downtime is intentionally resolved **between active sessions**.

## GM opens downtime

`/vc downtime open label:<optional>`

## Players submit projects

`/vc downtime project type:<type> title:<title> objective:<goal> ...`

Supported project categories include recovery, investigation, crafting, ritual, relationship, income/upkeep, surveillance, research, long-term project, and other.

Each project has a countdown/progress target and visibility of Party, Character Private, or Player Private.

`/vc downtime status` shows only projects the viewer is allowed to see.

## Resolution

The GM runs:

`/vc downtime resolve`

Veilkeeper creates a pre-resolution snapshot, resolves submitted projects against Daggerheart/Veiled City rules and current campaign state, applies legitimate state events, then creates a post-resolution snapshot.

Party-visible project results are posted to the campaign journal. Private results are sent through the player's private GM channel/DM. Hidden world/faction moves are recorded in GM state/logs rather than exposed to the party.

Downtime may advance clocks or establish consequences but may not silently rewrite current canon or mystery truths.
