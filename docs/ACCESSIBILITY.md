# Accessibility and Mobile Play

The bot is intended for Discord mobile as well as desktop.

## Per-player settings
Use `/vc player accessibility` to store:
- **response length:** compact / standard / descriptive;
- **mechanics detail:** full / standard / narrative;
- **screen-reader:** on/off.

The first implementation stores these preferences for the GM context. Public scenes remain compact by default.

## Private information
Run `/vc player private-channel` inside a channel that only the player, bot, and intended human GM can read. The bot prefers that channel for private discoveries and falls back to Discord DM.

## Recommended Discord layout
- `#the-table` — main in-character play channel
- `#table-talk` — OOC planning
- `#case-board` — optional human-maintained clue board
- one private text channel per player
- optional `#gm-log` visible only to server admins/human GM

## Mobile-friendly operating choices
- Short public narration by default.
- Slash commands for mechanical actions.
- No need to upload the rulebook each session.
- Persistent SQLite state survives Discord scrolling/history limits.
- `/vc intel recap`, `/vc intel clues`, `/vc intel caseboard` provide compact catch-up views.

## Screen-reader practice
Prefer:
- descriptive button/command labels;
- no information conveyed by color alone;
- short headings;
- explicit dice labels ("Hope die 8, Fear die 11");
- limited decorative emoji;
- no ASCII maps as the sole representation of spatial information.
