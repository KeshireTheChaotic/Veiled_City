# Veiled City v3.3.2 — Canon Proposal Review

- Added `/vc-canon proposals` for GM review of canon suggestions imported with character GM-hook packages.
- Added `/vc-canon proposal-resolve` with **Accept**, **Reject**, and **Accept Edited Value** outcomes.
- Accepted proposals now write through the normal authoritative canon ledger automatically.
- Contradictory accepted proposals create a linked canon conflict instead of overwriting established facts.
- Resolving a linked conflict through either canon command automatically updates the originating proposal to **accepted** or **rejected**.
- Pending/conflicted proposals are withheld from normal AI-GM hook context until resolved.
- Proposal history retains character, reason, original value, final value, source, conflict/event linkage, resolution note, resolver, and timestamps.
- Existing v3.3.1 canon-suggestion hooks are backfilled automatically; suggestions already matching current canon are recognized as accepted.
- `GM_CANON_character` exports now include imported canon-proposal history.
- No new channels, permissions, API keys, or `.env` settings. Run `npm run register` after upgrading.
