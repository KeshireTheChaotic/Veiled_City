# Veiled City v3.4.1 — Production Hardening

v3.4.1 focuses on multiplayer reliability and voice safety.

**State integrity**
- GM turns are now serialized per server, preventing simultaneous player messages from committing out of order.
- AI event/relationship/handout mutations are atomic: one failed state operation rolls the generated mutation back instead of silently applying only part of it.
- Discord delivery happens after state commit. If posting narration, handouts, logs, or reference updates fails, Veilkeeper reports that state is already committed and warns against retrying the turn.
- Encounter aftermath and downtime resolution use the same anti-duplicate commit model.

**Private scenes**
- Private clocks are isolated to the acting character/player.
- Private resource changes cannot target another PC.
- Private AI turns cannot directly change global Veil Exposure or write directly to the campaign-global canon ledger; private discoveries stay private until GM promotion.
- Generated private messages are restricted to valid session participants, and private-scene side messages can only target the acting player.

**Voice**
- Queue capacity is reserved before OpenAI TTS is called, so dropped/full-queue narration no longer incurs an unnecessary speech request.
- TTS synthesis is serialized to preserve narration order.
- Players cannot move Veilkeeper away from an existing voice channel; a GM/admin is required to relocate it.
- `/vc-voice repeat` now requires the requester to be in the active voice channel and has a per-user cooldown.
- Voice environment settings are validated at startup.

Discord text and SQLite remain the authoritative campaign record.
