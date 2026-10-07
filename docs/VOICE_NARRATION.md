# Veilkeeper Voice Narration — v3.5.0

Veilkeeper voice is an **optional output layer** for Discord voice channels. Discord text remains the authoritative campaign record. Voice does not replace SQLite state, canon, handouts, rules resolution, or message history.

## What is narrated

With `VOICE_MODE=narrative` (recommended), Veilkeeper automatically speaks only the public `result.narration` produced for `#the-table` turns while it is connected to a voice channel.

It does **not** automatically speak:

- GM-private state
- private player scenes
- rules-desk answers
- slash-command confirmations
- handout contents
- state errors / GM logs
- hidden canon or hidden relationship data

`VOICE_MODE=off` disables automatic narration. `VOICE_MODE=full` is reserved for broader in-character narration behavior; in v3.4.0 it uses the same safe public-GM narration path as `narrative` rather than risking mechanics/private leakage.

## Requirements

1. Discord bot permissions in the voice channel:
   - View Channel
   - Connect
   - Speak
2. FFmpeg installed and available in `PATH`.
3. OpenAI API access using the same `OPENAI_API_KEY` already used by Veilkeeper.
4. Run `npm install` after upgrading so `@discordjs/voice` and `opusscript` are installed.
5. Re-register commands with `npm run register`.

The Docker image in v3.4.0 installs FFmpeg automatically.

### Windows FFmpeg check

In PowerShell:

```powershell
ffmpeg -version
```

If Windows cannot find it, install FFmpeg and add its `bin` directory to `PATH`, then restart PowerShell/Veilkeeper.

## `.env` configuration

```ini
VOICE_ENABLED=true
OPENAI_VOICE_MODEL=gpt-4o-mini-tts
VOICE_MODE=narrative
VOICE_NAME=cedar
VOICE_INSTRUCTIONS=Low-key occult noir narrator. Measured pace, restrained emotion, clear diction, cinematic but never melodramatic.
VOICE_SPEED=1.0
VOICE_MAX_CHARS_PER_TURN=12000
VOICE_MAX_QUEUE=8
```

Built-in OpenAI speech voices supported by this release:

`alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.

OpenAI currently recommends `marin` and `cedar` for best quality. The speech endpoint also accepts delivery instructions for models such as `gpt-4o-mini-tts`.

## Discord commands

```text
/vc-voice join
/vc-voice leave
/vc-voice status
/vc-voice repeat
/vc-voice pause
/vc-voice resume
/vc-voice configure
/vc-voice narrate
```

### Join

A player already connected to the desired voice channel runs:

```text
/vc-voice join
```

Veilkeeper joins that channel. The command explicitly discloses that narration is AI-generated.

### Runtime configuration

GM/Admin:

```text
/vc-voice configure mode:narrative voice:cedar speed:1.0
```

You can also change the delivery instructions at runtime. Runtime changes reset when the process restarts; use `.env` for permanent defaults.

### Repeat without another TTS request

```text
/vc-voice repeat
```

Veilkeeper keeps the most recently synthesized narration in memory and replays that audio. This does **not** submit another speech-generation request and therefore avoids a duplicate speech-generation charge.

### One-off narration

GM/Admin:

```text
/vc-voice narrate text:"The elevator stops at a floor the building does not have."
```

This submits a normal speech-generation request and queues the audio.

## Using a custom OpenAI voice

If your OpenAI organization has custom-voice access, create an approved voice through OpenAI's Audio/Voices API. Sample-based voices require the speaker's consent recording and a matching audio sample. OpenAI currently limits custom voices to eligible customers.

Once OpenAI returns a voice ID such as:

```text
voice_123abc
```

set:

```ini
VOICE_NAME=voice_123abc
```

or at runtime:

```text
/vc-voice configure voice:voice_123abc
```

Veilkeeper passes custom voice IDs to the speech endpoint as a custom voice object. A prompt-created voice that is supported only by OpenAI Live cannot be used by this v3.4.0 speech-endpoint implementation; use an audio-sample custom voice for Veilkeeper narration.

OpenAI custom voice documentation:
https://developers.openai.com/api/docs/guides/custom-voices

Text-to-speech documentation:
https://developers.openai.com/api/docs/guides/text-to-speech

## Privacy and campaign safety

- Voice audio is ephemeral output. It is not treated as canon by itself.
- The Discord text narration is authoritative.
- Private/GM-only content is excluded from automatic speech.
- Voice synthesis is attempted only when Veilkeeper is actually connected to a voice channel, preventing unnecessary TTS generation while nobody is listening.
- The most recent audio is cached in memory for `/vc-voice repeat`; it is not added to the campaign database.
- Temporary MP3 playback files are deleted after playback.

## Troubleshooting

### `/vc-voice status` says FFmpeg NOT FOUND
Install FFmpeg and ensure `ffmpeg -version` works from the same shell/service account used to run Veilkeeper.

### Bot joins but is silent
Check channel-specific **Speak** permission and server mute status. Also confirm `VOICE_ENABLED=true`.

### `OpenAI speech request failed (400/404)`
Check `OPENAI_VOICE_MODEL` and `VOICE_NAME`. For custom voices, verify the voice belongs to the same eligible project/API context and has not been deleted/revoked.

### Narration is too long or expensive
Lower `VOICE_MAX_CHARS_PER_TURN`, use `/vc-voice configure mode:off` between narrated scenes, or disconnect with `/vc-voice leave`.

## v3.5.0 queue and access safeguards

Queue capacity is reserved before speech synthesis begins. If the configured queue is full, narration is rejected before an OpenAI speech request is made. Per-guild speech synthesis is serialized so later narration cannot overtake an earlier turn merely because its TTS request completes sooner.

A player can use `/vc-voice join` when Veilkeeper is disconnected or already in that same channel. Moving an existing connection to a different voice channel requires a GM/admin. `/vc-voice repeat` requires the requester to be in Veilkeeper's active voice channel and uses `VOICE_REPEAT_COOLDOWN_SECONDS` (default `8`) as a per-user anti-spam cooldown.
