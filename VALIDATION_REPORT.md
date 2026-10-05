# Veiled City Multiplayer Discord v3.2.4 — Validation Report

**Build date:** 2026-10-05

## Result
**PASS**

## Character export checks

- Player-safe live export from current SQLite character state: **PASS**.
- Player `format:all` returns JSON + Markdown + DOCX: **PASS**.
- Player export excludes character-linked GM-only facts: **PASS**.
- GM `format:all` returns 9 files: **PASS**.
- Required GM naming conventions: **PASS**.
  - `GM_HOOKS_character.*`
  - `GM_PRIVATE_character.*`
  - `GM_CANON_character.*`
- GM_PRIVATE export includes character-linked private facts/clocks: **PASS**.
- GM_CANON export retrieves associated canon ledger entries: **PASS**.
- DOCX output is a valid OOXML ZIP package: **PASS**.
- Sample generated DOCX rendered successfully through LibreOffice: **PASS**.
- Rendered pages visually inspected for clipping/overlap: **PASS**.

## Code / content checks

- Modified JavaScript syntax (`node --check`): **PASS**.
- Discord command-schema validation: **PASS**.
- Root commands: **17**.
- `/vc-character` command size: **1172 / 8000 characters**.
- Character export database integration test: **PASS**.
- Veiled City content validator: **PASS**.
- Domain cards: **84**.
- Content Markdown files: **51**.
- Content JSON files: **10**.

## Deployment impact

- Database migration: **none**.
- New Discord channels: **none**.
- New Discord permissions: **none**.
- New OpenAI/API settings: **none**.
- Additional npm dependencies: **none**.
- Discord command re-registration: **required** (`npm run register`).

## Credential-dependent tests

Live Discord attachment delivery was not exercised because it requires the user's Discord credentials. The generated attachment buffers, names, command schema, and export content were validated locally.
