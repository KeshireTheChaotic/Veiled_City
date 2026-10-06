# Veiled City Multiplayer Discord v3.4.0 — Validation Report

Validated: 2026-10-06

## Result

**PASS** for source/package validation available in this build environment.

## v3.4.0 voice checks

- Added `bot/src/voice.js` with OpenAI `/v1/audio/speech` generation, Discord playback queue, in-memory last-narration replay cache, temporary MP3 cleanup, runtime voice/mode/speed/instruction controls, and FFmpeg detection.
- Automatic voice synthesis is invoked only from the public `#the-table` GM narration path. Private player scenes, GM-private state, rules answers, handouts, and slash-command output are not auto-routed to TTS.
- `VOICE_ENABLED=false` returns before any TTS request.
- `/vc-voice repeat` requeues cached audio rather than generating new speech.
- Built-in voice validation accepts the documented OpenAI speech voices; custom `voice_...` IDs are passed as `{id: ...}`.
- TTS input is split below the OpenAI 4096-character speech-input limit.
- Markdown/code/mentions/URLs receive speech-safe cleanup before synthesis.
- Discord client now enables `GuildVoiceStates` intent.
- Dockerfile installs FFmpeg.

## Command validation

Discord command schema validation passed with **20 root commands**.

Largest relevant roots:

- `/vc-character`: 1661 / 8000 characters
- `/vc-encounter`: 1649 / 8000 characters
- `/vc-handout`: 1552 / 8000 characters
- `/vc-voice`: 616 / 8000 characters

No required-after-optional ordering errors were found.

## Regression validation

- Node syntax checks passed for all `bot/src/*.js` and `bot/scripts/*.mjs`.
- Existing v3.3.3 offline campaign smoke suite passed after version update.
- Voice-specific local smoke test passed for speech-text sanitization and the disabled/no-TTS path.
- No SQLite schema migration was introduced in v3.4.0.
- Existing character narrative, canon proposal, handout/evidence, relationship, encounter aftermath, snapshot, and export code remains intact.

## Content validation

- Domain cards: **84**
- Content Markdown files: **53**
- Content JSON files: **10**

## Dependency note

The build environment could not complete a live `npm install` before its network timeout, so Discord voice transport was not connected to a real Discord server during packaging. Command-schema and voice unit validation used temporary local dependency stubs, which were removed before packaging. Deployment should run `npm install` normally. v3.4.0 declares `@discordjs/voice`, `opusscript`, and `libsodium-wrappers`; native playback additionally requires FFmpeg in `PATH` (Docker installs it automatically).

## Deployment requirement

Because `/vc-voice` is a new root command, run:

```text
npm run register
```

after upgrading.
