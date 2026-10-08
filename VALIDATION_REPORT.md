# Veiled City Multiplayer Discord v3.7.0 — Production Validation Report

Validation date: 2026-10-07

## Verdict

**Application/package validation: PASS.**

v3.7.0 implements the post-v3.6.0 operations roadmap except deployment CI/reproducible-build automation, which was explicitly deferred. The release adds command idempotency, a GM overview, World Director controls/history, fact lifecycle/provenance, backup/restore, an authoritative mutation ledger, AI confidence handling, incremental module decomposition, and campaign diagnostics.

## Implemented operations hardening

### Duplicate-delivery protection

Mutating Discord slash interactions use the Discord interaction ID as an operation receipt. If Discord delivers the same interaction again, VeilKeeper returns the previously captured successful response rather than applying the mutation twice. Successful mutating commands are also represented in the mutation ledger.

This protects duplicate delivery of the same interaction. A human manually issuing the command again receives a new Discord interaction ID and is intentionally treated as a new operation.

### GM overview

`/vc-gm overview` aggregates current GM-facing campaign state, including scene/session context, roster attention, World Director state, clocks/threads, canon/proposals, encounter state, and other outstanding operational items.

### World Director observability and controls

`/vc-director` now provides `status`, `history`, `pause`, `resume`, and GM-triggered `run`. Automatic director passes retain durable history and rationale. Pausing the Director suppresses autonomous world movement without using real-world elapsed time to advance the campaign.

### Fact lifecycle and provenance

Facts support edit, archive, and promotion workflows. Fact rows retain source/provenance metadata and confidence. Exact active duplicates are deduplicated. Existing player/GM visibility boundaries remain enforced.

### Backup and restore

`/vc-admin backup`, `backups`, `restore-preview`, and `restore` expose first-class campaign recovery. Restore creates a pre-restore safety snapshot and preserves operational audit/provenance records rather than erasing the evidence of administrative actions.

### Authoritative mutation ledger

AI/World Director mutations and successful mutating slash commands are recorded in a persistent ledger with source/provenance and before/after state where available. `/vc-admin ledger` exposes the audit trail to authorized operators.

### AI confidence handling

Mandatory post-turn review categories now include confidence. Proposed authoritative changes below the configured 55% review floor are not committed and can be surfaced for GM attention. World Director output is subject to the same low-confidence suppression rule.

### Campaign diagnostics

`/vc-admin doctor` checks campaign/schema health, roster/orphan state, proxies, canon integrity, stale pending technical director passes, required runtime files, configured Discord channels, and privacy/permission problems.

### Incremental module decomposition

New operational responsibilities are separated into dedicated modules for idempotency, diagnostics, and GM overview aggregation. Direct database implementation details remain behind the `VeiledDB` boundary established in v3.6.0.

## Additional defect fixed

The audit found two `VeiledDB` methods named `getRelationship`; the later ID-based method shadowed the tuple lookup used by AI relationship deltas. The tuple lookup is now explicitly `findRelationship(...)`, and the regression suite verifies AI relationship mutation uses the correct lookup.

## Validation results

The combined application gate completed successfully:

- Static quality boundary: **PASS** — 30 production source modules
- Whitespace/format gate: **PASS** — 40 source/script modules
- JavaScript syntax: **PASS** — 40 source/script modules
- Discord command schema: **PASS** — 21 root commands
- Offline campaign smoke suite: **PASS**
- Production regression suite: **PASS**
- Refactor regression suite: **PASS**
- v3.7.0 operations regression suite: **PASS**
- Content package validator: **PASS** — 84 domain cards / 53 Markdown / 10 JSON
- Content manifest verification: **PASS** — 64/64
- Direct SQLite access outside `db.js`: prohibited by the quality gate
- Relationship lookup shadowing regression: **PASS**
- Duplicate-interaction mutation regression: **PASS**
- Backup/preview/restore regression: **PASS**
- Director pause/history regression: **PASS**
- Mutation provenance/ledger regression: **PASS**
- Low-confidence state-review regression: **PASS**

The quality checker reports 218 legacy long-line warnings. They remain non-blocking technical debt; newly added code is governed by the established code-quality boundary rather than mass-formatting legacy behavior in this feature release.

## Database migration

Migration is additive and automatic. Startup advances the SQLite schema to `PRAGMA user_version=370` and preserves existing campaign data.

## Discord registration

**Run `npm run register` once after upgrading.** The slash-command schema changed with the new `/vc-director`, `/vc-admin`, and `/vc-gm` subcommands.

## Dependency / deployment note

Deployment CI and reproducible-build automation were intentionally excluded from this release at the user's request. No GitHub Actions workflow was added. As in v3.6.0, this validation environment cannot produce a trustworthy npm registry-generated transitive lockfile. On a connected deployment host, run `npm install`, retain the resulting real `package-lock.json`, and run `npm run audit:prod`.

SDK-dependent application tests were executed against isolated local Discord/OpenAI test doubles because registry installation is unavailable in this environment. Those test doubles are removed before release packaging and are not included in the ZIP.

## Package hygiene gate

Before release packaging the tree is checked to ensure it contains no production `.env`, SQLite database, log files, `node_modules`, or temporary test doubles. Root and content manifests are regenerated/verified and the finished ZIP is integrity-tested.
