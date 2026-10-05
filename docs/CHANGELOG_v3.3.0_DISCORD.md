# Veiled City v3.3.0 — Evidence & Campaign Consequences

- Added **Handouts/Evidence**: Veilkeeper can create artifacts during play or via `/vc-handout`, with Canonical/Partial/Unreliable/Illustrative authority and Public/Party/Player/Character/GM visibility.
- Handouts can be listed, shown, redelivered, archived, and exported as **JSON, Markdown, DOCX, or All**; local creation/export has no AI cost.
- Added a persistent **Relationship Graph** for PCs, NPCs, factions, locations, debts, trust, hostility, affection, authority, contacts, and more.
- Added `/vc-relationship import-hooks` for a **one-time backfill** of Home, Person, Obligation, and Faction Connection hooks from existing characters. New characters seed these automatically.
- Added **Encounter Aftermath** for evidence, clocks, Veil Exposure, relationships, threads, canon, and other justified post-combat consequences.
- Aftermath can be `auto`, `confirm`, or `none`; set per `/vc-encounter end` or globally with `ENCOUNTER_AFTERMATH_MODE`.
- `confirm` stores a draft for `/vc-encounter aftermath-confirm` or `aftermath-discard`; `auto` snapshots state before applying consequences.
- Removed `/vc-character concept`; use `/vc-character create` or `/vc-character import` with prepared character packets.
- Existing v3.2.4 databases migrate additively. Run `npm run register` after upgrading, then run `/vc-relationship import-hooks` once for legacy characters.
