## v3.2.2 — Discord Command Registration Hotfix

- Fixed `APPLICATION_COMMAND_TOO_LARGE` registration failure caused by 73 subcommands under one `/vc` root.
- Split commands into 17 smaller roots such as `/vc-session`, `/vc-character`, `/vc-encounter`, `/vc-combat`, and `/vc-rules`.
- Moved character advancement to `/vc-level` and deterministic encounter combat controls to `/vc-combat`.
- Added local validation of Discord's 8,000-character per-command limit to `npm run check`.
- Existing campaign databases, characters, channels, permissions, and `.env` files remain compatible.
- Run `npm run register` after upgrading to replace the old command tree.
