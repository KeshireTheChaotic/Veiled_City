# Veiled City v3.2.4 — Character Export

- Added `/vc-character export` for players to download their **current live character sheet** from SQLite.
- Export formats: **JSON**, **Markdown**, **DOCX**, or **All** (all three at once).
- Player exports are **PLAYER SAFE** and exclude GM-only canon/private state.
- Added `/vc-character export-gm` for GM/Admin use on any campaign character.
- GM exports are separated as **GM_HOOKS_character**, **GM_PRIVATE_character**, and **GM_CANON_character**.
- `format:all` on GM export produces all three formats for all three GM bundles (**9 files total**).
- GM_HOOKS contains structured hooks/permissions; GM_PRIVATE contains character-linked private facts/clocks/threads/references; GM_CANON contains associated canon and conflicts.
- DOCX files are generated locally with no OpenAI call or added API cost.
- No database migration, new channels, permissions, API keys, or npm dependencies are required.
- Run `npm run register` after upgrading to register the new export commands.
