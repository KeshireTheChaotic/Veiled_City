# Upgrade: v3.5.3 → v3.5.4

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and preserve `.env`.
3. Overlay the v3.5.4 package files.
4. From `bot/`, run `npm install`.
5. Run `npm run check`, `npm run test:offline`, and `npm run test:production`.
6. Run `npm run register` once because the `/vc-canon proposals` and `/vc-canon proposal-resolve` Discord descriptions were generalized beyond imported proposals.
7. Start Veilkeeper.
8. Ensure a GM log is configured, for example: `/vc-campaign channels gm_log:#gm-log state_errors:#state-errors`.

The database migration is automatic and additive. v3.5.4 adds proposer/source metadata columns to `canon_proposals`; existing proposal rows and canon state are preserved.

Private player canon requests now enter the existing proposal queue. They do **not** become canon until a human GM resolves them.
