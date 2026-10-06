# Character Narrative Markdown — v3.3.3

Veilkeeper's structured character JSON remains authoritative for mechanics, resources, advancement, hooks that have dedicated fields, and other machine-readable state. v3.3.3 adds a separate Markdown layer for **freeform character narrative that does not fit cleanly in JSON**.

## Standard paths

Player-safe narrative:

```text
PLAYER/PLAYERS/<Character_Name>.md
```

GM-only narrative:

```text
GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md
```

`/vc-character narrative-export` returns a ZIP preserving those relative paths so it can be unpacked directly into a Veiled City content/package tree.

## Importing

A player may import or update narrative for a character they own:

```text
/vc-character narrative-import character:<name> scope:player file:<.md>
```

A GM/Admin may import either player-safe or GM-private narrative for any campaign character:

```text
/vc-character narrative-import character:<name> scope:gm_private file:<.md>
```

For new externally-created characters, the same files can be attached during the existing import workflow:

```text
/vc-character import file:<CHARACTER_Name.json> narrative:<PLAYER/PLAYERS/Name.md>
/vc-character import-gm-hooks file:<GM_HOOKS_Name.json> narrative:<GM_PRIVATE/PLAYERS/GM_PRIVATE_Name.md>
```

Runtime imports are stored in SQLite. The packaged `content/PLAYER/PLAYERS` and `content/GM_PRIVATE/PLAYERS` directories document the portable filesystem convention; the source tree itself is not the authoritative runtime database.

## Exporting

```text
/vc-character narrative-export [character] [scope:player|gm_private|all]
```

- Players may export their own `player` narrative.
- GM/Admins may export `player`, `gm_private`, or `all` for any campaign character.
- If a scope has never been imported, the export contains a small editable scaffold rather than silently omitting the file.

## Runtime use

Veilkeeper includes imported narrative when it is relevant to:

- normal AI-GM turns involving the character,
- party assembly,
- late/replacement character arrival planning,
- encounter aftermath,
- downtime involving the character.

Narrative is intentionally **supplemental**:

1. Structured character JSON wins for mechanics/resources.
2. The canon ledger wins for durable world truth.
3. GM-private Markdown is secret context and must not be revealed until discovered in play.

Narrative Markdown is included in campaign snapshots/rollback.
