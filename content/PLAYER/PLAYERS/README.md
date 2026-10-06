# Player Character Narrative Markdown

This directory is the standard package path for **player-safe freeform character narrative** that does not fit Veilkeeper's structured character JSON.

Naming convention:

`PLAYER/PLAYERS/<Character_Name>.md`

Runtime Discord imports are stored in SQLite with `/vc-character narrative-import scope:player`; the source tree is not the authoritative runtime database. `/vc-character narrative-export` recreates this path in a ZIP for editing, backup, or transfer.

Structured JSON remains authoritative for mechanics/resources. This Markdown is supplemental narrative context.
