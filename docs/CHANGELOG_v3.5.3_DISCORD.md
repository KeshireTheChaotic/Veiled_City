# Veiled City v3.5.3 — GM Session Roster

- Added GM-only `/vc-session roster` for a single authoritative view of who is controlling which character.
- Shows Discord player → primary/guest character assignments and current attendance state.
- Shows offscreen, background-safe, and PC proxy absence handling.
- Reverses proxy assignments so GMs can immediately see which player is controlling another PC.
- Shows active NPC proxy assignments and their control level.
- Separates pending NPC proxy offers from active control.
- Flags present players who do not have an active PC/guest character assignment.
- Roster responses are ephemeral and may split into multiple private messages for large groups.
- Uses existing session/proxy state; no database migration is required.
- `/vc-session` slash commands must be re-registered after upgrading.
