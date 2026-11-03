# Live qualification runbook — test guild only

Authorized scope (user decision, 2026-11-03): live qualification in the **test guild 1467249344947159291** only, inference spend capped at **$5 total**, source data from a **copy** of the legacy database. Never the production guild or database. The assistant does not handle secrets; you run these commands.

Before anything: the bot token that was pasted into chat is exposed. Reset it in the Discord Developer Portal (Bot -> Reset Token) and use the new value only in your own terminal.

## Prerequisite found by the first live smoke attempt (2026-11-03)

A login smoke test with the legacy .env reached Discord (the token was accepted) but the gateway refused the connection: **"Used disallowed intents"**. The native client requests the privileged **Server Members Intent** because its audience check lists every guild member (who can see a channel decides who may read a message). The legacy client never requested it, so it is not enabled for this application. Before any live run, open the Discord Developer Portal -> your application -> Bot -> Privileged Gateway Intents and turn on **Server Members Intent** (Message Content must stay on). No message was sent, no command registered, no model called, and the temporary copy of the legacy database was deleted.
## 0. Preferred: use the legacy .env in ChatGPT mode (user instruction, 2026-11-03)

The native start can load the legacy environment file by path; this repo never reads, prints or copies its values. Set only these in your terminal, then skip the secret lines in step 1:

```powershell
$env:VK2_ENV_FILE = "D:\Library\Development\Veiled_City\bot\.env"   # supplies DISCORD_TOKEN (and AI_AUTH_MODE / OPENAI_GM_MODEL if set there)
$env:AI_AUTH_MODE = "chatgpt"               # model calls use the Codex CLI ChatGPT sign-in (run `codex login` once); no API key, local testing only
$env:VK2_MODEL = "<model id>"               # optional; otherwise OPENAI_GM_MODEL from the .env is used
$env:VK2_ALLOWED_GUILD_ID = "1467249344947159291"   # required: the native bot ignores every other guild
```

Notes: existing terminal variables win over the file. Confirm the file's `DISCORD_GUILD_ID` is the test guild before starting; the allowed-guild setting is the enforcement, not the file. ChatGPT mode has no per-token spend, so the cap is the call budget (`VK2_MAX_TURNS`, default 10). Whether to reset the token that was pasted into chat is your call; if it is the token in this .env, resetting means updating the file.
## 1. Prepare (PowerShell, from D:\Library\Development\Veiled_City_2\rebuild\bot)

```powershell
# Copy of the legacy database (adjust the source path to your legacy DB file)
Copy-Item "<path-to-legacy-db>" "$env:TEMP\vk2-legacy-copy.sqlite"

# New, empty directory for the native stores
$env:VK2_NATIVE = "1"
$env:VK2_NATIVE_DIR = "$env:TEMP\vk2-native-stores"
$env:VK2_LEGACY_DB = "$env:TEMP\vk2-legacy-copy.sqlite"

# Secrets: type these yourself; do not paste them into chat or commit them
$env:DISCORD_TOKEN = "<new token after reset>"
$env:DISCORD_CLIENT_ID = "1555295975042457702"
$env:DISCORD_GUILD_ID = "1467249344947159291"
```

## 2. Register commands in the test guild only

Confirm `npm run register` targets the guild given by DISCORD_GUILD_ID (guild-scoped, not global) before running it. The native router claims only commands already in the schema (`vc-session start|end|present|absent|arrive|leave`, `vc-roll effect`).

## 3. Start the native path

```powershell
npm run start:v2:native
```

What this exercises: native interaction routing (death prompts, attendance, GM session start/end, PC bootstrap preview/review, registration, rebind, reopen via `vc-roll effect` JSON) and player-message evidence capture. Without step 3b no model calls occur.

## 3b. Optional: withheld GM drafts under the call cap

A second opt-in turns player messages into **withheld GM drafts** (stored in the native turn store; never sent to Discord; the console prints only `native-draft-withheld <messageId>`). Context is empty for now (no GM records composed), so drafts test the provider path, not story quality.

```powershell
$env:VK2_INFERENCE = "1"
$env:OPENAI_API_KEY = "<your key, typed by you>"
$env:VK2_MODEL = "<model id>"
$env:VK2_MAX_TURNS = "10"   # hard ceiling on provider calls (1-100); each call is bounded to 1024 output tokens
npm run start:v2:native
```

The call ceiling plus the output-token bound limits spend; check your provider dashboard against the $5 cap, since tokens in are not capped by this code.

## 4. Checks to run and report back

1. `vc-session start` as a GM-role member (expect private reply, session in native store).
2. `vc-roll effect` with `{"op":"pc-register","actor":"<character id>"}` then `{"op":"pc-bootstrap-preview","actor":"<id>"}` and the exact review with the returned snapshotHash.
3. `vc-session present|absent|arrive|leave` as an owner (absent/leave accept the new optional `character`).
4. A player message in a registered channel (evidence capture only).
5. `vc-session end`, then `{"op":"session-reopen","session":"<id>"}`.
6. With step 3b running: after a player message, `vc-roll effect` with `{"op":"draft-list"}` as a GM-role member privately lists up to five withheld drafts (source id, fingerprint and first 180 characters; nothing is sent to players).
7. To send one reviewed draft: `vc-roll effect` with `{"op":"draft-publish","source":"<source id>","fingerprint":"<64-hex fingerprint from the list>"}` as a GM-role member. It re-checks the GM role and the original channel audience, sends the text once (no mentions, one message, up to 1,900 characters) and records no knowledge or canon acknowledgement. A send that cannot be confirmed is held as `publication_uncertain` and is never retried.

Stop with Ctrl+C (graceful close). Delete `$env:VK2_NATIVE_DIR` and the DB copy afterwards.

## Not yet qualified

Live inference, the GM turn runner, performance targets and production cutover remain open and need their own authorization.

