# GM historical-record archival command — implementation plan

Status: **IMPLEMENTED — OFFLINE QUALIFIED**. The owner subsequently authorized implementation on `main`, followed by commit, push and production pull. Application version remains `10.0.0`; no schema migration is required. No live command registration or bot restart is included.

Authority: Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. Administrative archival is neither player withdrawal nor consent, approval, resolution, or a fictional outcome.

## Production maintenance completed — 2026-10-14

Development/production source anchor: `e136a2858cc1c324a3bf2a727bb0c6c91fe0ef40`, application `10.0.0`, schema `460`.

The owner explicitly authorized production archival after a read-only audit. A one-off, bounded SQLite maintenance transaction added **17 GM-private `historical_record_archive` annotations and one mutation-ledger entry**. No original record was updated or deleted. No application constructor, migration, provider, Discord client, or bot startup was invoked.

| Original record kind/status | Count | Ended sessions |
| --- | ---: | --- |
| `compound_action` / `ready` | 8 | 1–2 |
| `compound_action` / `blocked` | 3 | 2 |
| `compound_action` / `clarification` | 1 | 2 |
| `semantic_intent_proposal` / `awaiting_referent` | 1 | 4 |
| `pvp_output_quarantine` / `needs_scope_review` | 4 | 3–4 |

Batch: `historical-archive-batch:42b90a0ff8e6ff0f78ce08eddaa1c2d114dc28dfb9cea557bb33d593a544c54e`.

Consistent SQLite backup (includes private campaign information; keep local and outside Git):
`C:\Users\Keshi\AppData\Local\VeiledCity\maintenance-backups\pre-historical-archive-20261014.sqlite`.

Actual maintenance checks:

- Read-only preview: 17 candidates, zero writes, no active session, unresolved native obligations, or pending deliveries in the inspected campaign.
- SQLite online backup: 13,770,752 bytes; `quick_check` passed. Backup table fingerprints matched the production transaction snapshot before mutation.
- Rehearsal on a separate backup copy: 17 annotations + one audit entry; every existing row and every other table unchanged. All six characters preserved.
- Rehearsal retry: zero writes. Active-campaign negative guard: rejected, exit 1 as expected.
- Real `certifiedSessionRecap` adapter on backup versus rehearsed copy: identical across four sessions, including the one nonempty certified recap.
- Production transaction: 18 writes, foreign-key check passed, original rows/other tables unchanged; subsequent identical apply: zero writes.
- Independent post-commit, read-only verification: original rows preserved across all 55 tables, all 17 target fingerprints and 24 related bindings validated, certified recaps unchanged, `quick_check` and foreign-key checks passed; verification made zero writes.

Backup SHA-256: `b7b4aa87f11565b494530d3f95be5cd7c197e32e57cb45622fc9be15bb2d6b3a`.

**Original maintenance limitation, now addressed by this implementation:** the old runtime did not interpret these annotations. The new operational health, doctor diagnostics and pending-memory projections validate closure evidence and filter archived work before pagination. Generic raw-record reads deliberately retain original statuses. Running processes must load the new code before report filtering changes; no bot restart was performed by this task.

## 1. GM interface

One admin subcommand is added:

```text
/vc-admin archive-history operation:preview session:<ended-session-number>
/vc-admin archive-history operation:apply preview:<token> reason:<administrative-reason>
/vc-admin archive-history operation:list session:<ended-session-number>
```

These definitions are implemented offline and require the owner's normal separate Discord command registration before appearing in Discord. Both flattened `/vc-admin` and the legacy grouped adapter are supported. Require one explicit ended session per preview; no destructive `all`, reset, or purge action exists. Copy the exact `preview` token from the ephemeral `historical-archive.json` attachment into apply. Tokens expire after ten minutes; an unused token does not survive process restart. Completed operations have durable receipts and do survive restart.

- Authenticate GM/admin through existing native `isGM` checks, never model fields or caller-supplied `gm:true`.
- Respond ephemerally; preview/apply use deferred acknowledgements before database/backup work.
- Preview/list are read-only and generate no model request or gameplay event. Use bounded summaries, pagination, and GM-private attachments for metadata, not raw player/private narration.
- Preview gives eligible/held/already-archived counts, exact target identifiers, reason codes, session state, reference dependencies, and a short-lived guild/user-bound confirmation token.
- Apply requires that exact token and a reason. Changed source/session/status/owner/dependency evidence requires a fresh preview. Never silently expand the target set.
- Return an idempotent batch receipt. Repeating an acknowledged interaction or identical batch creates no additional annotations/effects.

## 2. Eligibility and native safety

Reuse the existing session, action-dependency, publication, and receipt machinery. Do not introduce another adjudication system.

Eligible initial classes are the three kinds/status sets in the maintenance inventory above, only with an unambiguous, same-guild ended-session association. Require `ended_at`, a nonactive campaign reference, and exact target/source ancestry. Unknown/malformed/mismatched sessions are held, not guessed from text. Conservatively hold active/quasi-active obligations even if a session was ended incorrectly.

Before application, inspect dependencies in both directions and hold any target needed by a current native operation, including pending rolls, PC incoming attacks/defense/Armor/death, PvP agreements/exchanges/Fear, action continuations, and unresolved or uncertain delivery. Never dismiss Fear, forgive costs, erase damage, select owner choices, or call gameplay executors to make records eligible. Independent valid records can be archived only if a safe separation is demonstrated.

For compound-action closure, identify its exact typed action and semantic proposal as related history. Accepted/proposed statuses are not human-approval queues and do not justify fabricating successful outcomes. Preserve canonical owner source spans and all existing outcome receipts.

Keep quarantined drafts GM-private and noncanonical. Archival never authorizes recap publication, shared memory, voice, or another PC's dialogue/reaction. No new fictional source is manufactured for administrative closure.

## 3. Persistence contract and backward compatibility

Use existing `city_records` and `mutation_ledger`; no destructive schema migration is expected. Introduce a validated version-1 annotation reader/service and retain the production annotations already written.

Existing annotation format:

- kind `historical_record_archive`, status `archived`, visibility `gm`;
- deterministic key `historical-archive:<sha256(JSON.stringify([guild, target_kind, target_key]))>`;
- original target `source_event`, current recorded simulation tick/minute (never advance time);
- `data_json`: `version`, `batch`, `session_id`, `session_number`, `target_kind`, `target_key`, `original_status`, `original_row_hash`, `stored_row_hash`, `related`, `disposition`, `archived_at`, `actor`, `reason`, `canonical:false`, `authorizes_execution:false`, and administrative `authority` explanation;
- disposition `administratively_closed_ended_session`;
- `stored_row_hash`: SHA-256 of the original database row serialized in `SELECT *` column order;
- maintenance-only `original_row_hash` additionally includes `archive_session_id` and `session_number` from the preview join; validate that definition for compatibility, not as an alternative native receipt;
- each `related` item contains exact `kind`, `key`, and original database `row_hash` for a paired typed intent/semantic proposal;
- maintenance actor `local-owner-authorized-maintenance` is an operator attribution, **not** an authenticated Discord GM principal. Future command batches record the actual native-authenticated reviewer separately.

Do not rewrite original target statuses/data or existing source events: delivered archive certificates hash them. Do not opportunistically rewrite the one-off annotations to another format. A future additive contract version must retain read compatibility and explicit nonauthorizing semantics.

Use a single transaction and exact snapshot/revision checks for annotation + audit writes. Require a consistent backup/snapshot through a verified existing backup facility, or a SQLite online backup outside tracked/runtime export surfaces. A plain main-file copy is not a sufficient WAL-aware backup. Revalidate after asynchronous backup and before commit. Keep audit and backups GM/operator-private.

## 4. Projection and report integration

Add explicit archival-aware operational/review projections rather than changing generic authority-bearing `getCityRecord`/`listCityRecords` reads globally.

- `active` view excludes only successfully validated archived work units; `history`/`all` preserves originals and closure annotations.
- Report original native status separately from administrative closure, e.g. `blocked · archived (session ended)`, never `resolved`.
- Filter before SQL pagination/LIMIT so archived rows do not starve live incidents. Include bounded historical counts and a GM-only list view.
- Cover primary targets and explicitly bound related proposals/intents without double-counting them as independent approvals.
- Missing/malformed annotation, mismatched original fingerprint/session/guild, or revoked archival annotation must not hide a live obligation. Surface a private conflict requiring review.
- Preserve the distinct treatment of failed historical turns, delivered publications, resolved receipts and native archives; those were not cleanup targets.
- Update `operationalHealthData`, operational health incidents and applicable admin/action-review diagnostics; audit every current pending-inbox consumer before claiming complete coverage.
- Archive annotations are not an execution permit, source revocation, player cancellation, or consent. Native current-session/source/owner checks remain mandatory even if a caller bypasses a display filter.
- Ensure generic memory/context/backup exports cannot promote administrative metadata into fiction or disclose GM-private original drafts.

## 5. Ordered implementation and lean qualification

### A — Service and annotation compatibility

Write failing synthetic tests for ended-session eligibility, exact related bindings, read-only preview, active-session refusal, dependency holds, backup failure, transactional rollback, stale-preview rejection, same-batch/interaction replay and compatibility with the 17 version-1 maintenance annotations. Implement the small native administrative service/repository methods. Keep model/provider/Discord transport calls absent from the service.

### B — GM adapter and projections

Write failing adapter tests for unauthorized/cross-guild requests, actual GM authentication, token/user/guild/revision binding, expired confirmation, acknowledgement timing, output chunking, GM-private listing, filter-before-pagination, already-archived counts, and no effects after uncertain Discord confirmation delivery. Add the one subcommand and targeted operational projections, including dry-run/list paths. Registration remains offline until separately authorized.

### C — Qualification and documentation

Add assertion-level integration evidence that archived sources/receipt hashes/certified delivered recaps are unchanged; six synthetic imported characters, owners, sheets, resources, player choices, native outcomes and configuration remain identical. Exercise ended-session historical records alongside a separate live session with unrelated player activity. Verify restart/idempotency, source retraction, private quarantine sinks and bounded large inventories. Preserve FH40, PVP30q, OBS21, damage/death, D08 and outbox security.

Run focused tests while developing. At the frozen phase gate sync the version-10.0.0 release manifest, run `npm run check`, one complete network-denied `npm run validate`, inspect compact JSON for failed/not-run mandatory cases, and run `git diff --check`. Repeat full qualification only after executable changes or failure, in accordance with lean policy. Actual implementation qualification is recorded below; the earlier planning-only task did not claim a full-suite run.

Commit only after that future implementation qualifies and owner scope permits. A deployment, command registration, live test, push, or bot restart needs separate authorization.

## 6. Recovery and rollback

An archive operation is append-only administrative history. If mistakenly applied, prefer a new GM-private audited reversal annotation targeting the exact batch/records; do not delete immutable evidence or change native outcomes. A reversal only changes administrative display eligibility and never makes old actions executable or republishes drafts. Define and test this explicitly before offering a reversal control.

The production backup is a last-resort recovery source. Do not overwrite a subsequently used campaign with it, copy a database over an open process, or remove WAL/SHM files. First take a new consistent backup and compare later gameplay changes. For this annotation-only operation, scoped audited reversal is preferable to whole-database restoration. Keep application rollback compatible with retained, inert archival annotations.

## 7. Implementation and qualification ledger

Starting branch/HEAD: `main`, `e136a2858cc1c324a3bf2a727bb0c6c91fe0ef40`; fetched `origin/main` matched before implementation. The preexisting untracked plan was preserved and incorporated.

Production interfaces:

- `historical-archive.js`: native administrative preview/list/apply, process-signed GM/guild/session-bound exact-state previews, v1 maintenance compatibility, dependency graph, annotation validation and fail-closed archival projection.
- `VeiledDB`: bounded guild-scoped archival inventory, complete logical safety backup in `campaign_backups` (all nonbackup campaign tables, including rolls/mutation/operation receipts), replay lookup and filter-before-pagination administrative reads. Backup, annotations, audit and operation receipt commit atomically. This path does not call snapshot pruning or a gameplay executor.
- `commands.js` / `command-definitions.js`: dedicated private GM adapter bypasses player upserts, generic receipt capture and continuation/model/publication work; both grouped/flattened forms are tested. Lost acknowledgement retries reuse the durable result rather than rerunning archival.
- Operational health/doctor: content-free archived/conflict counts; unverified or reversed annotations expose review incidents, never hide obligations. Scoped-memory pending-reference ranking excludes archived work; generic native reads remain unchanged.

Safety scope and limits: one ended session, maximum 200 candidate work units; per-table inventory cap 10,000. Preview fails on overflow. A projection unable to validate a bounded inventory hides nothing and emits a private conflict, so unrelated narrative retrieval can continue. Unknown/unscoped tables require explicit compatibility work, never an incomplete backup. Selected-session obligations/turns/delivery are conservatively held; cross-session bidirectional dependencies hold the affected work unit without blocking independently safe archival. New unrelated gameplay can stale a preview and require refresh; there is no background cleanup or automatic owner choice. Public command/model payloads cannot supply GM authentication.

No reversal command is offered: the reader conservatively exposes a batch referenced by a reversal annotation for review. A future authenticated reversal writer is separate work. None of these annotations grants old sources new execution authority. Legacy application rollback leaves the additive annotations inert and may show original unfinished statuses again.

Actual focused evidence:

- Initial guarded run exited 1, `ERR_MODULE_NOT_FOUND` for the absent archival service (no implementation existed).
- First implementation run: 9/13 pass. A reverse-reference scope issue was corrected; fixture corrections were documented (repository missing receipts return undefined, apply has no session option, and acknowledged delivery requires terminal turn stage).
- Additional ARC17 red-first owner-decision test: 0/1, missing hold on an orphaned pending native choice. Removed the unsafe suffix exemption; its parent is no longer assumed to exist.
- ARC22/23 red-first checkpoint: 0/2. Ambiguous session ancestry was omitted instead of reported held; failed Fear was incorrectly treated as a terminal consequence. Both were corrected without weakening native validation.
- Focused ARC01–ARC23: 23/23 pass, zero skips, before final integration qualification. Coverage includes read-only privacy, six retained characters, native saved dice, backup/transaction rollback, expiry/tampering/source/owner changes, real adapter authentication, grouped compatibility, native holds, cross-session independence, restart/idempotency, uncertain Discord reply, v1 annotations, before-pagination filtering, certified history and bounded recovery.
- T1 impacted suites: operational metrics 15/15, publication 23/23, D07 scoped-memory assertion suite PASS. The final complete validator reran these on the final executable tree, including the later ARC22/23 corrections.
- Final gate: `node scripts/sync-release.mjs 10.0.0` (626 files), `npm run check` exit 0; one complete `npm run validate` exit 0, **147/147 mandatory suites**, **0 failed / 0 not-run**, **26/26 acceptance mappings**, both D08 suites passed, **455,831 ms**. Prior committed baseline was 146 suites; it was not redundantly rerun before implementation. Network denied, live requests 0, billable tokens 0. Compact report preserved locally in TEMP as `veiled-historical-archive-qualified-report.json`; no live performance claim.
- Result-only ledger/guide updates follow successful qualification; resynchronize and verify manifest hashes plus `git diff --check`, without repeating the same executable qualification. No live Discord, live model, credentials, or production database operation is part of implementation testing. Owner-authorized production source pull does not start the bot or register commands.
