# Veiled City v3.7.0 — GM Operations & Recovery

- Added `/vc-gm overview` for a consolidated GM campaign dashboard.
- Added `/vc-director status`, `history`, `pause`, `resume`, and `run`.
- World Director passes now keep durable history/rationale; low-confidence proposed moves are not committed.
- Added `/vc-gm fact-edit`, `fact-archive`, and `fact-promote`.
- Facts now retain provenance/confidence metadata and exact active duplicates are deduplicated.
- Added `/vc-admin backup`, `backups`, `restore-preview`, and `restore` with automatic pre-restore safety snapshots.
- Added `/vc-admin ledger` for authoritative mutation provenance and before/after state where available.
- Added duplicate-delivery protection for mutating Discord interactions using operation receipts.
- Added `/vc-admin doctor` to detect database, roster, proxy, canon, channel/privacy, and runtime-file problems.
- Expanded AI post-turn review with confidence scoring; ambiguous changes below 55% stay uncommitted for GM attention.
- Fixed AI relationship-delta lookup being shadowed by an older duplicate method name.
- Continued module decomposition with dedicated idempotency, diagnostics, and GM-overview services.
- Database migration is automatic; existing campaign data is preserved.
- Run `npm run register` once after upgrading because the command schema changed.

**Status: production validation required after install.**
