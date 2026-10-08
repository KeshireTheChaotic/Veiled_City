# Veiled City v3.8.0 — Persistent NPC Cognition

- Added persistent **NPC profiles, memories, knowledge/beliefs, and goals**.
- NPC beliefs are now explicitly separate from objective facts/canon; NPCs can be mistaken, suspicious, or working from rumors.
- Added relevance-ranked memory retrieval so long campaigns use only the NPC context that matters to the current scene.
- Memories track importance, confidence, provenance, recall reinforcement, subject, sentiment, and lifecycle state.
- Knowledge supports `known`, `suspected`, `rumor`, `doubted`, and `unknown` states.
- Goals track priority, progress, horizon, dependencies, acceptable methods, and status.
- Added Veiled City-specific cognition rules for **hospitality/obligations, supernatural impressions, thresholds, anchors, and the Veil**.
- Ordinary hospitality does not automatically create a supernatural contract; established custom, terms, invitation/exchange, oath, or Court/Concord practice must support it.
- Mandatory post-turn review now includes NPC cognition and can persist meaningful NPC memories/knowledge/goals automatically.
- World Director context now uses persistent NPC goals and subjective knowledge without granting NPCs GM omniscience.
- Added GM-only `/vc-gm npc-state` to inspect an NPC's cognition.
- Added one-time `/vc-admin seed-npc-cognition` to bootstrap cognition from existing GM NPC dossiers plus structured campaign NPC references/relationships.
- NPC cognition is included in backups/GM exports and excluded from player-safe exports.
- Database migration is automatic to schema **380**.
- Run `npm run register` once after upgrading.
