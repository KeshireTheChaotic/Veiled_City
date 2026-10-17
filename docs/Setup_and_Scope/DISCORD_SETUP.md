# Discord application, channels and commands

Veilkeeper uses a Gateway-connected bot and registered slash commands; a public HTTP interaction endpoint is not required for this documented configuration.

## Application setup

1. Create/use a Discord application, copy its Application ID and bot token privately.
2. In **Bot → Privileged Gateway Intents**, enable **Message Content Intent** if the bot should react to regular scene messages.
3. Invite with OAuth scopes **`bot`** and **`applications.commands`**. For a private application, use OAuth2 URL Generator and keep Installation's public install link disabled as applicable.
4. Grant **View Channels**, **Send Messages**, **Read Message History**; add **Attach Files** and **Embed Links** for attachments and formatted delivery. Use **Send Messages in Threads** only if relevant. **Connect** and **Speak** are voice-only.
5. Do **not** grant Administrator as a shortcut.

## Channel separation

| Channel | Access/purpose |
| --- | --- |
| `#the-table` | Players and GM; audience-shared roleplay (not GM secrets) |
| Rules/reference/caseboard/journal/known NPCs/locations | Appropriate player-visible service surfaces |
| GM log and `#state-errors` | GM/admin + bot only; may contain sensitive diagnostics or a sanitized failed-delivery relay |
| Each player's private channel | That owner + GM/bot only; register from inside with `/vc-player private-channel` |

Use `/vc-campaign setup` for main play channel, GM role and response mode; `/vc-campaign channels` for optional configured support channels. Verify real Discord permissions for every private destination: merely naming a channel does not guarantee secrecy.

## Command registration and naming

Run `npm run register` from `bot/` after schema changes. The command builder in `bot/src/command-definitions.js` constructs separate roots such as `/vc-session`, `/vc-character`, `/vc-level`, `/vc-roll`, `/vc-story`, `/vc-gm`, `/vc-admin`, `/vc-city` and `/vc-director`. Some legacy grouped `/vc ...` dispatch paths can be accepted for specific operations, but use the registered split roots in instructions and the Discord picker as the final schema source.

For example:

```text
/vc-session start title:Opening Night assembly:auto
/vc-session present character:YourCharacter
/vc-session assembly-status
/vc-session assemble
```

## Response modes

- `mention`: only explicit mentions or commands initiate GM processing; lowest background routing.
- `assisted`: configured default; likely game declarations or mentions.
- `active`: route each relevant play-channel message through lightweight classification; incurs more provider usage.

These modes select input routing, not agency, mechanics, privacy or deployment privileges. The bot can surface asynchronous turn progress text when configured; a progress notice is not a completed narration.

## Private delivery failures

Owner-private delivery may use a registered channel/DM with native destination validation. A failed DM or transport result is not permission to publish another PC's information in the public channel. Unknown/uncertain sends must be reconciled by a GM, not automatically retried with new prose. See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) and [GM_OPERATIONS.md](GM_OPERATIONS.md).
