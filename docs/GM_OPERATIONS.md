# GM Operations and Recovery — v3.7.0

v3.7.0 adds operational tooling intended for long-running campaigns where state visibility, recoverability, and provenance matter as much as individual GM commands.

## GM dashboard

`/vc-gm overview` provides one ephemeral GM readout containing the active session, attendance count, Fear, Veil Exposure, current encounter, World Director cadence/pending state, actionable canon proposals/conflicts, active clocks/threads, and recent facts.

## World Director controls

- `/vc-director status` — current cadence, scene, pause state, and durable pending pass.
- `/vc-director history` — recent autonomous passes with layer, outcome, rationale, and timestamp.
- `/vc-director pause` — pauses automatic round/scene/downtime world movement without pausing player turns or using wall-clock time.
- `/vc-director resume` — resumes automatic passes. Durable pending party passes remain available.
- `/vc-director run` — human-GM requested one-time world review. It may still return no move when no justified consequence exists.

Director output below the confidence floor is not committed. The proposed move is reduced to a GM-review note instead of speculative authoritative state.

## Fact lifecycle

- `/vc-gm fact-add`
- `/vc-gm fact-list`
- `/vc-gm fact-edit`
- `/vc-gm fact-archive`
- `/vc-gm fact-promote`

Facts retain source, session, provenance JSON, confidence, creation/update timestamps, and visibility. Exact active duplicates are deduplicated. Archive preserves history instead of deleting the row. Promotion can make a fact party/public knowledge or submit it to the authoritative canon ledger.

## Backups and restore

Snapshots remain lightweight rollback points. v3.7.0 additionally provides first-class logical backups:

- `/vc-admin backup`
- `/vc-admin backups`
- `/vc-admin restore-preview`
- `/vc-admin restore`

Restore creates a safety snapshot before replacing authoritative campaign state. Audit/provenance history and the backup records themselves are intentionally outside the restored campaign-state payload so recovery does not erase the record of what happened.

## Mutation ledger

`/vc-admin ledger` shows recent authoritative mutation records. The ledger stores source layer, actor, interaction/message provenance, mutation type/entity, confidence, rationale, trigger text, and before/after JSON where available. Human mutating slash commands also create command-level ledger records after a successful response.

## Idempotency receipts

Mutating slash-command deliveries are keyed by the immutable Discord interaction ID. If Discord redelivers the same interaction, Veilkeeper returns the stored successful response instead of applying the operation twice.

This guarantees duplicate-delivery protection for the same Discord interaction. A human manually issuing a new command creates a new Discord interaction and is therefore treated as a new operation.

## `/vc-admin doctor`

The doctor checks database schema version, active roster consistency, orphaned character/session/handout references, proxy consistency, malformed visibility values, duplicate current canon, pending director state, required runtime files, configured GM role existence, GM-only channel privacy, play-channel availability, and registered player-private channel privacy.

Doctor is diagnostic only; it never changes campaign state automatically.
