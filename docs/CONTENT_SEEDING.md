# Privacy-aware content seeding (v4.0.0)

After deploying, restart the bot and run `npm run register` from `bot` to replace
the former `/vc-admin seed-npc-cognition` command with:

```text
/vc-admin seed-data
```

Only a configured GM or a member with Manage Server permission may run it.
The response is ephemeral. No seeded content is posted to player channels.
The source is the bot's configured content root, not Discord attachments.
The command recursively discovers every file under `GM`, `GM_PRIVATE`, and
`PLAYER`; `GM_PRIVATE` is this package's GM folder. Symbolic links and junctions
are rejected so the import cannot escape those roots.

## What enters the database

- `seed_documents`: every original file, relative path, SHA-256, encoding,
  visibility, character boundary where applicable, actor, and timestamp.
- `seed_catalog`: all JSON array elements or object members, preserving their
  full structured values and source privacy. Recognized categories include
  NPCs, factions, locations, adversaries, environments, mysteries and GM state;
  other JSON is retained as generic structured data.
- Missing NPC profiles, memories, knowledge boundaries and goals are bootstrapped
  from NPC dossiers and existing structured campaign references/relationships.
  An NPC does not gain every secret in the source archive.
- Missing NPC/location references are GM-only, even when a dossier has a
  `public` description. Encountering a dossier is not an in-fiction discovery.
- Missing faction/location simulation entities retain their complete dossiers;
  faction agendas become private simulation goals. Named resource descriptions
  do not grant unlimited numeric action resources.
- Character narrative Markdown is also imported into `character_narratives`
  when it matches exactly one existing campaign character by normalized filename
  (or JSON name for archive linkage). The `GM_PRIVATE_` filename prefix is ignored
  for matching. Existing narrative text is never overwritten.

UTF-8 text and JSON are searchable in campaign content retrieval. Stored sources
take precedence over same-path packaged files. Binary files, including DOCX, are
stored losslessly as base64; they are not parsed for AI retrieval or mechanics.
Empty and unrecognized files are still archived.

This is a source import and safe bootstrap, not a campaign-state restore.
It does not invent Discord accounts, assign character ownership, automatically
convert arbitrary JSON into playable character sheets, promote proposals to
canon, activate mysteries, or overwrite live GM state/clocks. Those files remain
fully available in the source/catalog tables for deliberate use. Use existing
character import commands for mechanical sheets and existing GM commands for
live state changes.

## Privacy rules

GM and GM_PRIVATE sources always remain GM-only. A `visibility: public` field
inside them cannot weaken that boundary. General PLAYER content is party-safe,
unless explicit private visibility metadata tightens it. Nested private JSON
visibility or `is_secret: true` restricts the entire file conservatively.

`PLAYER/PLAYERS/<Character_Name>.*` is character-specific, not automatically shared
with the party. It is linked only on an unambiguous existing-character match;
unmatched or ambiguous files stay GM-only and are counted in the result. Files
under GM_PRIVATE/PLAYERS stay GM-only even after matching. Directory README
files are instructions rather than character narratives.

Player-facing rules retrieval excludes all GM/private and character-specific
sources. GM retrieval may use them as private reference context, not as automatic
permission to reveal them. Player-safe campaign exports include only party-safe
seed rows; GM-full exports and logical backups include every row. All operations
are scoped to one Discord server/campaign.

## Safety, retries and review

All files are read and JSON is parsed before writes. A safety snapshot, source
rows, catalog entries, runtime bootstrap and mutation ledger are committed in
one transaction. Invalid JSON or an application failure rolls back the entire
seed. The successful private response is captured for interaction retry safety.

The command is add-only and safe to run again. Existing source paths are skipped;
changed hashes are reported for GM review, never silently applied to live state.
New source paths can be imported on later runs. Existing NPC profiles are retained,
including campaigns previously seeded by the old command. A source change to an
existing dossier does not automatically modify its NPC goals or memories.

The response reports imports by visibility, structured entries, entities,
references, NPC profiles, narratives, archived binaries, skipped/changed sources,
unmatched character files and narrative conflicts/oversize files. Oversize
narratives remain in the source archive. Review unresolved character files using
the existing scoped narrative import command after establishing the character.

`/vc-admin doctor` reports whether the full content seed has run. To undo a seed,
use the existing campaign snapshot/rollback tooling; the pre-seed snapshot is
labelled `Pre-content seed`.

Offline coverage: `npm run test:seed`; full suite: `npm run validate`.
