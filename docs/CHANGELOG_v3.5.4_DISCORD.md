# Veiled City v3.5.4 — Private Canon Proposals

- Explicit player requests for **campaign canon** made in a private GM channel now create real pending canon proposals.
- Private scenes still cannot write directly to the global canon ledger; human GM approval remains mandatory.
- Veilkeeper now gives the player a deterministic private confirmation with proposal ID/status instead of merely claiming it was recorded in narration.
- New player proposals appear in `/vc-canon proposals` alongside imported character-hook proposals.
- The configured **GM log** receives the proposing player/character, canon key/value, requested visibility, proposal ID, and source context.
- If the GM-log channel is missing/unwritable, the proposal remains safely queued and Veilkeeper records a state-error fallback reference.
- Blocked private canon events are automatically converted into proposals when possible rather than being discarded.
- Repeated identical proposals are deduplicated instead of creating duplicate queue entries.
- `/vc-canon proposals` now identifies private-player vs imported proposal sources.
- Added proposer/source metadata migration for existing databases.
- No existing canon is changed automatically by this update.
