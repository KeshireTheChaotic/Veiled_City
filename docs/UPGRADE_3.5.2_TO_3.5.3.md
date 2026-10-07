# Upgrade: v3.5.2 → v3.5.3

## What changed

- Added GM-only `/vc-session roster`.
- The command reads existing session presence, character assignment, PC proxy, guest, and NPC proxy state.
- No database schema migration is required.
- Slash commands **must be re-registered** because `/vc-session` gained a new subcommand.

## Upgrade

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and preserve `.env`.
3. Overlay the v3.5.3 files.
4. In `bot/`, run `npm install`.
5. Run `npm run register` to publish the new `/vc-session roster` subcommand.
6. Run `npm run check`, `npm run test:offline`, and `npm run test:production`.
7. Restart Veilkeeper.

## Using the roster

Run `/vc-session roster` as a GM/admin during an active session. The response is ephemeral and includes current PC/guest mappings, attendance policy, PC proxy control, active/pending NPC proxies, and assignment warnings.
