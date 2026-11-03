# Live qualification runbook — test guild only

Authorized scope (user decision, 2026-11-03): live qualification in the **test guild 1467249344947159291** only, inference spend capped at **$5 total**, source data from a **copy** of the legacy database. Never the production guild or database. The assistant does not handle secrets; you run these commands.

Before anything: the bot token that was pasted into chat is exposed. Reset it in the Discord Developer Portal (Bot -> Reset Token) and use the new value only in your own terminal.

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

Stop with Ctrl+C (graceful close). Delete `$env:VK2_NATIVE_DIR` and the DB copy afterwards.

## Not yet qualified

Live inference, the GM turn runner, performance targets and production cutover remain open and need their own authorization.

