# Upgrade v3.6.0 → v3.7.0

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and `bot/.env`.
3. Overlay the v3.7.0 release files.
4. From `bot/`, run `npm install`.
5. Run `npm run validate` and `npm run audit:prod`.
6. Run `npm run register` once: v3.7.0 adds `/vc-director` and new `/vc-admin`/`/vc-gm` subcommands.
7. Start Veilkeeper and run `/vc-admin doctor`.

The database migration is additive and automatic. SQLite `PRAGMA user_version` becomes `370`. Existing campaign state, facts, sessions, canon, handouts, and snapshots are retained.

New tables store operation receipts, authoritative mutation provenance, World Director history, and logical campaign backups. Facts gain archive/provenance/confidence fields; campaigns gain the World Director pause flag.

No real-world scheduler is introduced. Pausing/resuming the World Director changes only autonomous fictional-world passes.
