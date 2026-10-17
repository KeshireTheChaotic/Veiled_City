# Security, privacy and native proof

## Protected data

Secrets include Discord token, API key, private character sheets/GM hooks, unrevealed campaign records, SQLite databases, GM log contents, and private transport/outbox receipts. Do not upload these to Git, public logs or a player-facing documentation ZIP. Protect the source `.env`, campaign DB and backups using local filesystem and Discord channel permissions.

## Audience and owner checks

The database distinguishes public/party/player/character/GM visibility and binds character-private material to the entitled Discord principal. Model output is **not** an authorization token. Native public/private publication parts carry proof of current scene, source, audience, target, owner and exact payload; validators recheck them on deferred send, restart and archive/recap projection. Reject rather than broadcast when source is revoked or permission cannot be proved.

GM-private import data remains private planning source. A `visibility: public` field inside a GM-only file cannot downgrade the file's restriction. NPC knowledge is not equivalent to full GM knowledge; private die results or the rules behind a feature are not automatically public facts. PvP and proxy/reaction ownership remain specifically bounded.

## Agency and mechanics

Players or lawful human proxies control their own declarations, Duality Dice, Help/Tag Team participation, optional Hope/Armor/resources, consent, surrender and death decisions. GM can autonomously adjudicate **supported** GM-owned rules, including actual native NPC attacks, but cannot forge a human principal or treat unsupported feature metadata as executable. A model-generated mechanical description without a saved native receipt is not an applied effect.

## API and Discord transport

The model may see GM-private context when its designated GM service legitimately needs it; audience-specific writers should receive only scoped source material. This is application-level isolation, not cryptographic confidentiality. Keep exceptionally sensitive secrets outside the runtime if needed. Limit the Discord bot's permissions; use private channels for owner information. Never expose uncertain private send body or metadata in a public error response.

## Incident controls

Stop further publication in affected scopes; inspect native source, recipient/body hash, delivery/receipt status and storage integrity. Do not regenerate fiction to bypass a hold or resend an uncertain message. Take a consistent backup; rotate exposed credentials; reconcile after source/role changes. For stale historical feature receipts, retain compatible read-side verification rather than silently changing their effects.
