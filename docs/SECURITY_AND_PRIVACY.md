# Security, Privacy, and Information Boundaries

## Secrets
Never commit:
- `DISCORD_TOKEN`
- `OPENAI_API_KEY`
- the populated `.env`
- live SQLite database backups containing private campaign data

`.gitignore` already excludes `.env` and local SQLite files.

## Discord permissions
Use the minimum permissions needed:
- View Channels
- Send Messages
- Read Message History
- Embed Links (optional but recommended)

Authorize the app with the `applications.commands` OAuth scope; that scope is separate from the bot permission checklist.

The bot also needs the **Message Content** privileged intent if you want it to react to ordinary roleplay messages rather than only slash commands/mentions.

Do not grant Administrator unless you intentionally accept the additional risk.

## Private-player channels
Discord channel permissions, not the language model, are the primary confidentiality boundary for player-only delivery. Configure a private channel for each player and run `/vc-player private-channel` there. In v3.1 the registered player's own messages in that channel are also private GM input during active sessions; other players must not be able to view the channel.

The database additionally stores visibility as public / party / player / character / gm. v3.1 also records the intended user/character subject on new private transcript rows so private runtime context can be selected without mixing players.

## Model boundary
The OpenAI request can include GM-private state because the model is acting as GM. The prompt explicitly forbids leaking it into public narration, and the application separates public narration from player-private messages. This is a strong software convention, not a cryptographic isolation boundary.

For extremely sensitive secrets, a human GM can keep them outside the bot until they become relevant.

## Backups
Back up `bot/data/veiled_city.sqlite` between sessions. SQLite WAL mode may create `-wal` and `-shm` files while the process is running; stop the container before making a simple file-level backup, or use a SQLite-aware backup method.


## NPC Proxy confidentiality (v3.1.2)
Guest antagonist control uses a generated **sanitized player-facing package**, not the raw GM NPC record. The package is delivered to the player's registered private GM channel, falling back to DM. If both fail, the sanitized package is posted to configured `#state-errors` for an admin GM to relay.

For that fallback to work, `#state-errors` should be configured and visible only to Veilkeeper and human GM/admin roles. Do not grant guest players access to `#state-errors`.

The NPC Proxy packet may contain secrets that belong to that NPC, but must exclude unrelated GM-private information, hidden clocks, future scenes, other characters' private facts, and mystery answers the NPC does not know.
## Autonomous director and blocked actions (v3.5.0)

The autonomous world director is constrained by the same application-level visibility/scope guards as normal AI GM turns. A private scene cannot directly write campaign-global canon or Veil Exposure, mutate another PC's private resources/relationship state, or send its generated private side-message to another player. Private scene director context includes the acting character's private material but its private scene label is not copied into party director state.

When a scoped action is blocked, the application refuses that mutation, sends the acting player a sanitized private explanation, and writes the detailed reason to the configured GM log. If the private notice cannot be delivered, the GM log records the delivery failure. Other valid mutations in the same generated turn may still commit.

