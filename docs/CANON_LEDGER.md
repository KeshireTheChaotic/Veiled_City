# Canon Ledger and Conflict Resolution — v3.2.0

Long campaigns eventually produce contradictory names, relationships, rules, dates, and facts. v3.2.0 separates **durable canon** from ordinary notes.

## Commands

`/vc canon set key:<stable-key> value:<fact>`

`/vc canon status`

`/vc canon conflicts`

`/vc canon resolve conflict_id:<id> resolution:<existing|proposed|custom>`

## Behavior

Every current canon entry has a stable key, value, visibility, source/provenance, and supersession history.

When AI or human input proposes a different value for an existing key, Veilkeeper does **not** silently overwrite it. It creates a pending conflict for the human GM.

Resolution can:

- retain the existing fact;
- accept the proposed replacement;
- write a custom corrected value.

Replacing canon supersedes the previous record rather than deleting history.

The AI GM receives the current canon ledger as authoritative context and is instructed not to resolve contradictions by improvisation.
