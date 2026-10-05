# Character Concept Context Export

v3.3.1 replaces the removed in-bot AI concept generator with a player-safe export designed for external ChatGPT/Claude/Gemini character creation.

## Player command

```text
/vc-character context-export [history_sessions]
```

`history_sessions` defaults to 10 and may be 1-25.

Veilkeeper creates one ZIP containing:

- `AI_CHARACTER_CREATION_INSTRUCTIONS.md`
- `CAMPAIGN_CONTEXT.md`
- `CAMPAIGN_CONTEXT.json`
- `REFERENCE/PLAYER_COMPENDIUM.md`
- `SCHEMAS/CHARACTER_IMPORT_EXAMPLE.json`
- `SCHEMAS/GM_HOOKS_IMPORT_EXAMPLE.json`
- `GM_IMPORT_INSTRUCTIONS.md`

The export is built from authoritative SQLite state and current bundled player documentation. It contains only PUBLIC/PARTY campaign information. GM-only facts and character-private knowledge are deliberately excluded so a replacement/new PC does not inherit another character's secrets.

## Long-running continuity

The context includes:

- established party composition and current live roster;
- the requested number of recent session recaps;
- recent public/party table context;
- active/dormant/resolved case threads;
- known NPCs and locations;
- public/party relationship graph;
- player-safe canon and facts;
- public/party clocks;
- evidence/handout summaries;
- current/recent downtime state;
- the complete bundled Veiled City Player Compendium.

The current-state data (canon, relationships, cases, references, evidence) is more important than old raw transcripts. This keeps a long campaign useful without exporting the entire Discord history.

## External AI workflow

Upload the ZIP to ChatGPT and describe the desired PC. The included instructions require two JSON outputs:

1. `CHARACTER_<Name>.json` — player imports with `/vc-character import`.
2. `GM_HOOKS_<Name>.json` — separate GM-facing proposals tied to current cases/NPCs/factions/relationships.

GM hooks are proposals, not hidden truth. The external AI has no GM-private context and is explicitly forbidden from pretending otherwise.

## GM hook import

After reviewing the hook file:

```text
/vc-character import-gm-hooks file:<GM_HOOKS_Name.json>
```

The command:

- stores the hook package as GM-private character hooks;
- creates/updates any proposed relationship edges with GM visibility;
- stores canon suggestions only as GM-private suggestions;
- does **not** automatically make canon suggestions authoritative.

Promote an accepted canon suggestion later with `/vc-canon set`.

Imported GM hooks are supplied to Veilkeeper as optional GM seeds during normal play and are included in future GM character exports.
