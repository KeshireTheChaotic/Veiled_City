# Upgrade v3.7.0 → v3.8.0

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and `bot/.env`.
3. Overlay the v3.8.0 release files.
4. From `bot/`, run `npm install`.
5. Run `npm run validate` and `npm run audit:prod`.
6. Run `npm run register` once because v3.8.0 adds `/vc-admin seed-npc-cognition` and `/vc-gm npc-state`.
7. Start Veilkeeper.
8. Run `/vc-admin doctor` and correct any Discord configuration problems.
9. Run `/vc-admin seed-npc-cognition` **once per campaign**.
10. Inspect representative NPCs with `/vc-gm npc-state`.

The database migration is additive and automatic. SQLite `PRAGMA user_version` advances to **380**. Existing players, characters, sessions, facts, canon, relationships, backups, World Director state, and other campaign data are preserved.

The seed command creates its own pre-seed campaign snapshot and is protected by a durable one-time marker. Do not delete that marker merely to force a reseed; edit cognition deliberately or restore a pre-seed snapshot if recovery is required.

NPC cognition is GM-private subjective state. Player-safe exports and `/vc-intel` do not expose NPC secrets, beliefs, memories, goals, or personality profiles.
