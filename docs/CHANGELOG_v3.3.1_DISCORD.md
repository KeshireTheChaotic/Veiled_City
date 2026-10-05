# Veiled City v3.3.1 — Character Context Export

- Added `/vc-character context-export` for players to download a **player-safe current campaign package** for external AI character creation.
- Context includes recent session recaps, current/established party, cases, NPCs, locations, relationships, canon, facts, evidence, clocks, downtime, and the bundled Player Compendium.
- Long-running campaigns use current structured state plus configurable recent session history instead of exporting the full Discord transcript.
- GM-only and character-private information is excluded so new PCs do not inherit secrets.
- Package includes AI instructions and exact JSON examples for `CHARACTER_<Name>.json` and `GM_HOOKS_<Name>.json`.
- Added `/vc-character import-gm-hooks` for GM/Admin review/import of external GM hook proposals.
- Imported hooks and relationship suggestions remain **GM private** and become optional Veilkeeper seeds for assembly, arrivals, and normal play.
- Canon suggestions are imported for GM review only and never become authoritative until promoted with `/vc-canon set`.
- Context export and hook import are local operations with **no OpenAI API cost**.
- Run `npm run register` after upgrading.
