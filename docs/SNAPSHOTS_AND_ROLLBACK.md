# Campaign Snapshots and Rollback — v3.2.0

Snapshots are logical SQLite campaign-state captures. They are intended for recovery from bad state mutations, mistaken lifecycle changes, or unwanted AI consequences.

## Automatic snapshots

Veilkeeper creates snapshots around major mutations, including:

- before session start;
- before and after session end;
- before eventful AI state mutations;
- before character death/retirement;
- before level confirmation;
- before encounter start;
- before and after downtime resolution;
- before canon-conflict resolution;
- automatically before any rollback.

## GM commands

`/vc-admin snapshot`

`/vc-admin snapshots`

`/vc-admin rollback snapshot_id:<prefix>`

Rollback creates a **Pre-rollback safety** snapshot first, restores the selected authoritative state, and resynchronizes configured case/NPC/location surfaces. Bot-managed published-message identities are included in snapshot state.

Transcripts, roll history, and audit logs are intentionally not rewritten by rollback; they remain an audit trail of what occurred operationally.
