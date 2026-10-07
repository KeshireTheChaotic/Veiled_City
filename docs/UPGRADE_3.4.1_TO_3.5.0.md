# Upgrade v3.4.1 → v3.5.0

v3.5.0 adds the autonomous GM/world-director layer, blocked-action disclosure, and mandatory post-turn state review.

## Required deployment steps

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Overlay the v3.5.0 files.
4. From `bot/`, run `npm install` (or `npm ci` when a retained deployment lockfile is available).
5. Run `npm run check`, `npm run test:offline`, and `npm run test:production`.
6. Restart Veilkeeper.

The SQLite migration is **additive and automatic on startup**. v3.5.0 adds `sessions.director_state_json`; no manual SQL conversion is required.

No slash-command shape changed solely for this release, so command re-registration is not required when upgrading directly from v3.4.1. `/vc-campaign status` now reports director cadence/status using the existing command.

## Behavioral changes GMs should know

- Veilkeeper now gets autonomous world-reaction opportunities after all currently present player controllers have completed a GM-resolved party action, after real scene transitions, and during explicit mechanical downtime resolution.
- Director rounds are pacing only; they do not impose initiative or restrict player action order.
- Scene transitions supersede a pending round pass from the same cadence to prevent duplicate world movement.
- Private scene transitions run with private character context and remain private-scoped.
- `/vc-downtime resolve` now resolves player projects and performs a separate autonomous world-movement pass based only on the represented **in-game** downtime interval.
- Normal AI turns now require a complete post-turn state review. Inconsistent state review/mutation output is corrected once, then rejected if still invalid.
- Scoped actions that are forbidden are blocked without necessarily discarding other valid consequences. The acting player receives a sanitized private explanation and the GM log receives the detailed block.
- Party round/scene director passes are stored durably; generation/state failures leave them pending for a later retry.

See `docs/WORLD_DIRECTOR.md` for the complete behavior and safety boundaries.
