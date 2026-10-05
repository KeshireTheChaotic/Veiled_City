# Recommended Discord Channel Configuration — v3.1.2

## INFORMATION (read-only to players)
- `#start-here` — onboarding, session/character command cheat sheet.
- `#setting-guide` — player-safe Veiled City lore.
- `#rules-reference` — pinned Daggerheart and Veiled City quick references.
- `#house-rules` — Veil Exposure, attendance, guest/proxy, private-knowledge, and campaign-specific rules.

## CAMPAIGN
- `#the-table` — main IC channel; configured by `/vc-campaign setup`.
- `#case-board` — v3.1 automatically creates/edits player-visible case-thread messages.
- `#party-journal` — v3.1 automatically receives end-of-session recaps.
- `#known-npcs` — v3.1 automatically creates/edits player-known NPC summaries emitted by the GM.
- `#known-locations` — v3.1 automatically creates/edits discovered-location summaries emitted by the GM.

Recommended: players may read `#party-journal`, `#known-npcs`, and `#known-locations` but only the GM/Veilkeeper should post. `#case-board` may remain player-writable if you also want human theories alongside bot-published case threads.

## OOC
- `#table-talk` — player planning, jokes, scheduling, AFK notices. Not monitored as a game-input channel.
- `#rules-questions` — v3.1 cheap Rules Desk. Ordinary mechanical questions can be typed naturally here.

## PRIVATE
Create one channel per player, visible only to that player, Veilkeeper, and optionally the human GM. Example: `#keshire-to-gm`.

The player runs `/vc-player private-channel` inside it. During an active session, the channel is now two-way: messages from that player are sent to the AI GM privately and private discoveries do not become party knowledge automatically.

## GM PRIVATE
- `#gm-log` — automatic session lifecycle and meaningful state-event summaries. GM-only.
- `#state-errors` — automatic API/runtime/state failures with a reference ID. GM-only.

## Configure all support channels
```text
/vc-campaign channels
  rules_channel:#rules-questions
  case_board:#case-board
  journal:#party-journal
  known_npcs:#known-npcs
  known_locations:#known-locations
  gm_log:#gm-log
  state_errors:#state-errors
```

Run `/vc-campaign sync` afterward if upgrading an existing database with already-recorded case threads or references.


## Party assembly channel use
No new channels are required for v3.1.1.

- `#the-table` receives the public convergence opening and late/guest/replacement entry openings.
- each registered private GM channel receives that character's private opening/arrival hook;
- `#gm-log` receives assembly lifecycle notes.

If a player has not registered a private channel, Veilkeeper attempts a DM for their private entry hook.


## NPC Proxy delivery (v3.1.2)
No new Discord channel is required. For guest-controlled antagonists, Veilkeeper sends the sanitized control package in this order:
1. the guest's registered private GM channel;
2. DM if no usable private channel exists;
3. `#state-errors` if both private delivery paths fail, so a human admin GM can relay it.

Because step 3 is an explicit fail-safe, **configure `#state-errors` and keep it GM-only**.

A player who receives the packet by DM can act publicly in `#the-table`, but inbound DMs are not processed as campaign scene input in v3.1.2. For secret two-way antagonist play, create/register a private GM channel.
