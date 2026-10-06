# Character Export — v3.3.0

Veilkeeper can now generate downloadable files from the live SQLite character record. Exports reflect current level, resources, advancement state, hooks, inventory, and campaign knowledge instead of the original import packet.

## Player-safe export

Use:

```text
/vc-character export
```

Options:
- `character` — optional owned character name; defaults to the currently assigned character or first owned character.
- `format` — `docx`, `json`, `markdown`, or `all`.

Default format is `docx`.

Naming:

```text
CHARACTER_Elias_Mercer.docx
CHARACTER_Elias_Mercer.json
CHARACTER_Elias_Mercer.md
```

`all` sends all three files in one ephemeral Discord response.

Player exports are player-safe. They include only the character record and information visible to that player/character. GM-only canon and GM-private state are excluded.

The JSON remains re-import compatible: unknown export metadata fields are ignored by `/vc-character import`.

## GM-private export

Use:

```text
/vc-character export-gm character:"Elias Mercer" format:all
```

GM/admin permission is required. Default format is `all`.

The export is separated into three information classes:

```text
GM_HOOKS_Elias_Mercer.*
GM_PRIVATE_Elias_Mercer.*
GM_CANON_Elias_Mercer.*
```

`GM_HOOKS_` contains the character's structured narrative hooks, permissions, goals, anchors, faction connections, entry hooks, and exit hooks.

`GM_PRIVATE_` contains character-linked GM/player/character-private facts, clocks, threads, and references stored in campaign state.

`GM_CANON_` contains current canon ledger entries associated with the character plus relevant pending canon conflicts.

With `format:all`, GM export sends nine files: JSON, Markdown, and DOCX for each of the three GM-private categories. This stays within Discord's ten-attachment limit.

## DOCX generation

DOCX files are generated locally by Veilkeeper as standard OOXML packages. No OpenAI call is required and no additional npm dependency is used.

## Security

Player exports never include GM-private records. GM exports are delivered ephemerally and should not be reposted to player-visible channels unless the contained information has been revealed in play.

## v3.3.3 — Supplemental narrative Markdown

The normal character JSON/Markdown/DOCX exports remain structured live-state sheets. Freeform prose that does not belong in that structured export is handled separately with:

```text
/vc-character narrative-export
```

The returned ZIP uses:

```text
PLAYER/PLAYERS/<Character_Name>.md
GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md
```

This separation prevents custom prose from being mistaken for mechanical JSON fields while still making it available to Veilkeeper as campaign context.
