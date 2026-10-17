# Content import and source authority

## Operator procedure

From a configured, running bot, a GM/admin may run `/vc-admin seed-data` after reviewing the `CONTENT_ROOT` setting. The command imports source files under `GM`, `GM_PRIVATE` and `PLAYER`. It is a privacy-aware additive seed, **not** restoration, automatic canon promotion, ownership assignment or a mechanical character importer.

The seed archive records relative paths, content hashes, source visibility and parsed structured content. Recognized NPC, faction, location and similar dossiers can bootstrap **missing** entities without overwriting established campaign state. Raw documents, including unrecognized/binary material, may be archived without becoming AI-readable gameplay authority. Existing paths are skipped; changed hashes are reported rather than blindly applied. Invalid JSON or a transactional failure rolls back the seed.

## Visibility rules

- `GM` and `GM_PRIVATE` files remain GM-only even when a nested field says `public`.
- General `PLAYER` files can be party-safe, subject to narrower declared privacy.
- `PLAYER/PLAYERS/<Character_Name>.*` is character-scoped only on a uniquely matched, existing character; ambiguous/unmatched files stay private for review.
- `GM_PRIVATE/PLAYERS` remains GM-only. A hook or secret dossier may guide GM planning, but does not authorize public disclosure, character knowledge or a mechanic.
- Source ingestion does not establish an NPC's scene location, a PC's consent, a discovered clue, live faction resources or a retcon.

## Character hooks and Markdown

Use `/vc-character import` to import a player-safe mechanical JSON package. `narrative-import` can add scoped player or GM-private Markdown. `/vc-character import-gm-hooks` ingests GM-private hook proposals and optional GM-private narrative; these remain planning inputs. The current import normalization accepts recognized export-compatible structured hook packets, retains target/payload and review history, and rejects malformed recognized imports rather than silently discarding them.

For assembly, planners may inspect both GM and player material, but each player receives **only** sources they are entitled to see. Verified owner-entitled source threads may be projected as opening material; raw GM notes are not automatically delivered. Read [PARTY_ASSEMBLY.md](PARTY_ASSEMBLY.md).

## Safe review

Run `/vc-admin doctor` after seeding; inspect imports/skipped/changed/conflicts. Confirm private channel permissions. Use explicit review tools for inferred draft/canon/evidence promotions. Do not repeatedly reseed to fix missing narrative text or modify imported SQLite directly. Preserve a consistent database backup and operation receipt history before maintenance.
