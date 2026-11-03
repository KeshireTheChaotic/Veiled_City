# Live qualification runbook — test guild only

Authorized scope (user decision, 2026-11-03): live qualification in the **test guild 1467249344947159291** only, inference spend capped at **$5 total**, source data from a **copy** of the legacy database. Never the production guild or database. The assistant does not handle secrets; you run these commands.

Before anything: the bot token that was pasted into chat is exposed. Reset it in the Discord Developer Portal (Bot -> Reset Token) and use the new value only in your own terminal.

## Live status log

- 2026-11-03: Server Members Intent enabled by the user; login smoke passed (ready, exactly one guild, the allowed test guild, router and message observer attached, clean close). The prerequisite above is satisfied.
- 2026-11-03: `node --env-file=<legacy .env> src/register-commands.js` registered 24 root commands to guild 1467249344947159291 only (guild-scoped overwrite; includes the optional `character` option on `vc-session absent` and `leave`).
- 2026-11-03: native bot started against a scratch copy of the legacy database with ChatGPT-mode inference capped at 10 calls, allowed guild = the test guild. Stopping it deletes the scratch stores. Commands still to be exercised by a human in the guild: checks 1-7 below.
- 2026-11-03: first user commands were all held with "not confirmed and needs native review". Bot log cause: the test guild campaign record has no `gm_role_id`, and the native GM policy never guesses. Fix: explicit opt-in settings `VK2_GM_ROLE_ID`, `VK2_GM_USER_IDS` (comma-separated ids) and `VK2_GM_ALLOW_ADMINISTRATORS=1`; the bot was restarted with the administrator opt-in for the test guild only (anyone with Administrator or Manage Server there counts as GM). Prefer setting `VK2_GM_ROLE_ID` to a real GM role. Other held items were expected: attendance commands need an active session and a registered character first, and one roll-effect JSON op was not a supported native op.

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

Confirm `npm run register` targets the guild given by DISCORD_GUILD_ID (guild-scoped, not global) before running it. The native router claims only commands defined in the schema: `/vc-session start|end|present|absent|arrive|leave`, `/vc-player private-channel`, the typed `/vc-gm` subcommands (`session-reopen`, `register-character`, `rebind-character`, `bootstrap-preview`, `bootstrap-review`, `drafts`, `publish-draft`) and the owner death-prompt commands that already existed in `/vc-roll effect`. `/vc-roll` carries no GM operation.

## 3. Start the native path

```powershell
npm run start:v2:native
```

What this exercises: native interaction routing (death prompts, attendance, GM session start/end, PC bootstrap preview/review, character registration, rebind, session reopen, private channel) and player-message evidence capture. Without step 3b no model calls occur.

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
2. `/vc-gm register-character character:<character id>`, then `/vc-gm bootstrap-preview character:<id>`, then `/vc-gm bootstrap-review character:<id> snapshot:<hash shown by the preview>`.
3. `vc-session present|absent|arrive|leave` as an owner (absent/leave accept the new optional `character`).
4. A player message in a registered channel (evidence capture only).
5. `vc-session end`, then `{"op":"session-reopen","session":"<id>"}`.
6. With step 3b running: after a player message, `/vc-gm drafts` as a GM privately lists up to five withheld drafts (source id, fingerprint and first 180 characters; nothing is sent to players).
7. To send one reviewed draft: `/vc-gm publish-draft source:<source id> fingerprint:<64-hex fingerprint from the list>` as a GM. It re-checks the GM role and the original channel audience, sends the text once (no mentions, one message, up to 1,900 characters) and records no knowledge or canon acknowledgement. A send that cannot be confirmed is held as `publication_uncertain` and is never retried.

Stop with Ctrl+C (graceful close). Delete `$env:VK2_NATIVE_DIR` and the DB copy afterwards.

## Not yet qualified

Live inference, the GM turn runner, performance targets and production cutover remain open and need their own authorization.


## Private channel (corrected 2026-11-03)

The legacy design is kept: the character's owner runs `/vc-player private-channel` in their own private channel. The bot checks, from two fresh Discord reads, that only that owner can see it (administrators and the GM role are observers, not recipients) and registers it for the owner's scene. There is no GM channel-id command. Order: `/vc-session start`, register the character, then the owner runs `/vc-player private-channel` in their channel, then `/vc-session present`.

All GM operations are typed `/vc-gm` subcommands (user decision 2026-11-03); `/vc-roll` is dice only. The owner death-prompt commands still use the baseline `/vc-roll effect` option and are a separate decision.
