# Upgrade v3.4.0 → v3.4.1

v3.4.1 is a production-hardening release. It does not require a SQLite schema migration.

## Required deployment steps

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Overlay the v3.4.1 files.
4. From `bot/`, install exactly the dependency set represented by the release lockfile when present; otherwise install the exact package versions in `package.json`.
5. Run `npm run check`, `npm run test:offline`, and `npm run test:production`.
6. Restart Veilkeeper.

No slash-command re-registration is required solely for v3.4.1; the command shape is unchanged from v3.4.0.

## Behavioral changes

- Player/GM AI turns are serialized per Discord guild so two simultaneous player messages cannot commit state out of order.
- AI-generated state is committed atomically. If any state draft fails validation/application, the whole generated mutation rolls back.
- Discord publication failures happen after authoritative state commit and are reported as delivery failures. Players are explicitly told not to retry a committed turn to repair output.
- Encounter aftermath and downtime use the same commit-before-publish rule, preventing duplicate consequences on retry.
- Private scenes structurally isolate private clocks and PC resource changes to the acting player/character. Global Veil Exposure cannot be altered directly by a private AI turn.
- Private AI turns cannot write directly to the campaign-global canon ledger. Use a private fact/clue and let the human GM promote it when appropriate. Canon writes are restricted to `public`, `party`, or `gm` visibility.
- Generated private messages are restricted to the active session roster; private-scene private messages may target only the acting player.
- Voice narration reserves queue capacity before any paid speech request and serializes synthesis in invocation order.
- A normal player may connect Veilkeeper when it is disconnected or already in that player's channel, but only a GM/admin can move an existing voice connection to another channel.
- `/vc-voice repeat` requires the requester to be in Veilkeeper's current voice channel and is rate-limited per user.
- Invalid voice environment values now fail fast at startup.

## Dependency reproducibility note

The direct runtime dependencies in `bot/package.json` are pinned to exact versions. This release archive does **not** contain `node_modules`. A lockfile could not be generated in the packaging environment because npm registry access was unavailable. On the first connected deployment, run `npm install --package-lock-only` (or a normal `npm install`) and retain the resulting `package-lock.json` with your deployed copy for fully reproducible transitive installs.
