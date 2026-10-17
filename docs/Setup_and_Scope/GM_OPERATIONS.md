# GM operations, diagnostics and safe recovery

## Routine operator loop

Inspect `/vc-campaign status`, `/vc-session roster`, `/vc-session assembly-status`, `/vc-gm overview`, `/vc-director status`, and `/vc-admin doctor` as appropriate. Use source-specific pending/owner inboxes when an operation is held. Distinguish a native accepted result from a queued or delivered Discord message and from creative prose blocked by publication validation.

The World Director moves on bounded **fictional** opportunities, not elapsed wall-clock time. `/vc-director pause` stops automatic Director passes without freezing player commands; `/vc-director resume` and `run` use separate controls. A civic simulation d20 is not a combat roll. Delegation mode, allowlist, costs and expiry are administrative settings: supported AI-GM rulings do **not** implicitly expand the delegation policy.

## Assembly recovery

An acknowledged orientation is not necessarily a source-specific playable hook. Use the GM-only assembly status for `SOURCE_HOOK_DELIVERED`, `VERIFIED_SCENE_DELIVERED`, `FALLBACK_DELIVERED`, `legacy_untracked` and uncertainty. An explicit source-refresh action does not send messages; subsequent `assemble` can publish newly verified material without duplicating acknowledged parts. Never interpret a raw GM-private hook or old delivery count as proof that the PC was engaged or that the hook was disclosed.

## Saved outcomes and delivery incidents

1. **Identify the exact scope:** campaign/session, character/owner, native request/decision/source, stored outbox destination and body hash.
2. **Preserve evidence:** no manual state rewrites, no rerolls and no blanket resend of uncertain messages.
3. **Classify transport:** acknowledged delivered, demonstrably unsent or uncertain. Only the exact unsent part may retry through its native workflow.
4. **Revalidate authority:** source, role, scene, recipient, feature, costs and saved revisions. A held narrative part does not roll back a separately committed effect.
5. **Use explicit GM review/attestation** when provided. A "not sent" control is valid only when the GM actually verified the exact scoped legacy text was never delivered.

Private disclosure, consent, source retraction and late response conflicts are *expected holds*, not bugs to bypass with `human_reviewed=true` or ad-hoc SQL.

## Backups, snapshots and rollback

Use SQLite-aware online backup for live databases or stop the process before a simple file copy (WAL mode can produce `-wal` and `-shm`). Store protected backups outside the repo, verify integrity and restore a **disposable** copy before relying on them. `/vc-admin backup`, `backups`, `restore-preview`, `restore`, `snapshot`, `snapshots`, `rollback` and `ledger` have separate purposes. Restoring a pre-incident DB may erase valid later session play; code rollback should generally preserve committed records and outbox history.

For new native feature proof versions, a code rollback needs compatible readers for pending or saved attacks/reactions. Stop the matching instance, do not roll back by overwriting live SQLite, and never replay a completed Fear cost, damage roll or Discord send. See [DEPLOYMENT.md](DEPLOYMENT.md).
