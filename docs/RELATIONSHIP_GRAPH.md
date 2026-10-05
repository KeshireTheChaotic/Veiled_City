# Relationship Graph — v3.3.0

Relationships are stored as durable directed graph edges rather than only prose notes.

Each edge records:

- source entity and target entity
- relationship type
- intensity score from `-5` to `+5`
- visibility
- context note
- source/provenance

Supported entity types include characters, NPCs, factions, locations, obligations, and generic entities. Typical relationship types include trust, debt, fear, hostility, affection, authority, family, ally, rival, contact, and suspicion.

## Commands

```text
/vc-relationship list
```
Shows relationships visible to the invoking player/character. GMs can see GM-only edges.

```text
/vc-relationship set
/vc-relationship adjust
```
GM-only deterministic editing.

```text
/vc-relationship import-hooks [character]
```
One-time backfill for characters that existed before v3.3.0. With no character argument, it processes every legacy character in the campaign. It converts structured character hooks such as `home`, `person`, `obligation`, and `faction_connections` into relationship edges. Each character is marked after import, so later runs safely skip it.

Characters created under v3.3.0 automatically seed these hook relationships and do not require the migration command.

## AI use

Veilkeeper receives relevant player-visible edges in actor context and GM-visible edges in private GM context. GM responses, downtime, and encounter aftermath can propose structured relationship changes rather than relying on free-text memory.
