# Upgrade v3.3.3 → v3.4.0

v3.4.0 adds optional Discord voice narration. There is **no SQLite schema migration** for this release.

## Preserve

```text
bot/.env
bot/data/veiled_city.sqlite
```

Overlay the v3.4.0 files, then from `bot/` run:

```powershell
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because v3.4.0 adds `/vc-voice`.

## Install FFmpeg

Voice playback requires FFmpeg. Verify:

```powershell
ffmpeg -version
```

Docker deployments do not need a separate FFmpeg step; the v3.4.0 Dockerfile installs it.

## Enable voice

Add to `bot/.env`:

```ini
VOICE_ENABLED=true
OPENAI_VOICE_MODEL=gpt-4o-mini-tts
VOICE_MODE=narrative
VOICE_NAME=cedar
VOICE_INSTRUCTIONS=Low-key occult noir narrator. Measured pace, restrained emotion, clear diction, cinematic but never melodramatic.
VOICE_SPEED=1.0
```

Ensure Veilkeeper has **Connect** and **Speak** permissions in the intended Discord voice channel.

Then join that channel yourself and run:

```text
/vc-voice join
```

See `docs/VOICE_NARRATION.md` for built-in/custom voice configuration and troubleshooting.
