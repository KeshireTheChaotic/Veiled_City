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

## Bulk backfills and inferred drafts

Run `/vc-admin seed-data` again after upgrading. Previously accepted source files
are now used for runtime backfills even when their archive rows already exist.
Changed disk files are still **not** adopted: the accepted archived version is
the source of the backfill. Existing NPC profiles and live entities are preserved.
Missing primary NPC/faction agendas and the NPC's own explicitly listed
`knows`/`does_not`/self-secret entries are filled once without replacing existing
entries or completed goals. This reuses the original cognition seed policy, not
global knowledge of other dossiers. Per-source field receipts prevent later
seed reruns from undoing deliberate removals of those fields.

Every accepted document and structured entry gets a GM-only `seed_content`
projection containing its source path, hash, entry key, original privacy boundary,
and reference-only authority. Remaining catalog entries (including adversaries,
environments, mystery dossiers, GM-state templates, and arbitrary JSON) also get
`seed_library` entries. These are lossless source pointers into `seed_documents`
and `seed_catalog`, not a second mutable truth store. Inspect them with
`/vc-city records kind:seed_content` or `kind:seed_library`; the full accepted
payloads are included in GM-full exports and backups. General PLAYER material
remains available through the existing party-safe source archive/retrieval;
the administrative projections do not widen access to private character data.

NPC `speaking_style` or `portrayal_direction` objects produce pending portrayal
drafts for missing fields. Without explicit styles, conservative keyword rules
can infer diction from `public` portrayal prose (for example calm, practical,
formal, or wry). They never use `secret`, `knows`, or `want` to infer speech.
No model/TTS calls are made. Faction escalation arrays produce pending clocks
starting at zero, not live clocks. Explicit NPC/faction/location `simulation`
objects also produce drafts, with existing live fields protected on approval.

Optional GM JSON files can supply typed collections: `institutions.json`,
`districts.json`, `beliefs.json`, `cases.json`, `properties.json`,
`infrastructures.json`, `routines.json`, `communities.json`, `identities.json`,
`reputations.json`, `weather.json`, `personnel.json`, `history.json`,
`relationships.json`, `clocks.json`, `mysteries.json`, `speaking_styles.json`,
`simulations.json`, and `references.json`. Use arrays of envelopes or a keyed map.
An envelope contains `kind`, `key`, and `data`; collection filenames can supply
the kind. Arrays of explicit envelopes also work in other GM JSON files.
PLAYER files cannot seed GM actor configuration.

Example `GM/districts.json`:

```json
[
  {
    "key": "riverside",
    "data": {"name": "Riverside", "indices": {"safety": 50}, "connections": []}
  }
]
```

Supported draft kinds are `portrayal`, `simulation`, `clock`, `relationship`,
`mystery`, `reference`, and the core/civic kinds listed above. Data uses the
existing domain schemas and must pass their production validators at approval.
Dependencies must already exist: approve districts/institutions before dependent
infrastructure, routines, or personnel. A mystery needs an already established
canon anchor and at least three independent sourced clue routes; seeding does
not invent them. Major civic consequences use the dedicated city review flow.
Unstructured prose, unknown schemas, and campaign templates remain references;
the importer does not infer capacities, jurisdictions, NPC knowledge, ownership,
mechanical bonuses, or a new mystery culprit.

### Draft commands

All commands below require GM/admin permission and respond privately with a JSON
attachment containing complete results, including IDs, sources and proposals.

- `/vc-admin seed-drafts`: list pending drafts, 20 per page. Optional `page`,
  `status` (`draft`, `approved`, `rejected`, `removed`), and `query` filters.
  Supply `draft_id` to inspect one draft, including its `source_event`.
- `/vc-admin seed-add json:...`: create a private draft. Required JSON:
  `{"kind":"portrayal","key":"mara-voss","data":{"humor":"Dry and understated."},"source_event":"<active-event-key>"}`.
  Reuse an accepted source event from draft details, or create an explicit GM
  source with `/vc-city event`. Optional `reason` explains the proposal.
- `/vc-admin seed-edit draft_id:... json:...`: replace selected proposal fields
  (`kind`, `key`, `data`, `reason`). `data` replaces the complete proposed payload,
  rather than deep-merging it. Source provenance cannot be edited.
- `/vc-admin seed-remove draft_id:... reason:...`: remove a pending draft from
  the review queue, retaining its audit tombstone.
- `/vc-admin seed-approve draft_id:...`: validate and apply atomically, with a
  pre-approval safety snapshot. Existing live state is not overwritten. Failed
  validation leaves the draft pending and rolls back every approval write.
- `/vc-admin seed-reject draft_id:... reason:...`: reject a pending draft without
  changing live state.

For speaking-style approval, `public_voice:true` explicitly authorizes the
proposed diction for public narration; the default is private. Existing private
directions cannot be implicitly published by merging a new seed draft. Use the
existing `/vc-story portray` workflow to review that full direction separately.
The `voice_direction` feature flag still controls runtime use; approval neither
enables the flag nor initiates audio generation.

Only pending drafts are editable/removable. Approved data uses normal domain GM
commands for later changes. Removed/rejected drafts do not reappear on a seed
rerun, and edits/reviews are audited. Drafts, source projections, and library
entries are campaign-scoped and included in existing snapshots and GM-full
backups, never player exports. The seed response reports new projections,
library entries, and drafts separately from archived imports.
