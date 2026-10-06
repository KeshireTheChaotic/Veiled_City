# Veiled City v3.4.0 — Voice Narration

- Added optional **Discord voice narration** for Veilkeeper's public in-character GM narration.
- Added `/vc-voice join`, `leave`, `status`, `repeat`, `pause`, `resume`, `configure`, and GM-only `narrate`.
- Voice is a **non-authoritative output layer**; Discord text remains the official campaign record.
- Private scenes, GM-only state, rules answers, handouts, errors, and hidden canon are never auto-spoken.
- Uses OpenAI's speech endpoint with configurable model, voice, delivery instructions, and speed.
- Supports built-in voices plus eligible OpenAI **custom voice IDs** (`voice_...`).
- `/vc-voice repeat` replays cached audio without making another TTS request.
- TTS is only generated while Veilkeeper is connected to voice, helping avoid unnecessary API cost.
- Added queue/turn size caps and automatic temporary-audio cleanup.
- Added FFmpeg to the Docker image; Windows/native installs require FFmpeg in `PATH`.
- New `.env` controls include `VOICE_ENABLED`, `OPENAI_VOICE_MODEL`, `VOICE_MODE`, `VOICE_NAME`, `VOICE_INSTRUCTIONS`, and `VOICE_SPEED`.
- No database migration required.

**Upgrade:** preserve `.env` + `veiled_city.sqlite`, run `npm install`, `npm run check`, `npm run test:offline`, `npm run register`, then `npm start`.
