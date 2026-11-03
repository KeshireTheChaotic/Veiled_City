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

What this exercises: native interaction routing (death prompts, attendance, GM session start/end, PC bootstrap preview/review, registration, rebind, reopen via `vc-roll effect` JSON) and player-message evidence capture. It does **not** yet run the GM turn runner or inference; no model calls occur, so the $5 cap is untouched until the provider is composed.

## 4. Checks to run and report back

1. `vc-session start` as a GM-role member (expect private reply, session in native store).
2. `vc-roll effect` with `{"op":"pc-register","actor":"<character id>"}` then `{"op":"pc-bootstrap-preview","actor":"<id>"}` and the exact review with the returned snapshotHash.
3. `vc-session present|absent|arrive|leave` as an owner (absent/leave accept the new optional `character`).
4. A player message in a registered channel (evidence capture only).
5. `vc-session end`, then `{"op":"session-reopen","session":"<id>"}`.

Stop with Ctrl+C (graceful close). Delete `$env:VK2_NATIVE_DIR` and the DB copy afterwards.

## Not yet qualified

Live inference, the GM turn runner, performance targets and production cutover remain open and need their own authorization.
