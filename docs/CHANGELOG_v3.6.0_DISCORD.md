# Veiled City v3.6.0 — Production Refactor & Privacy Enforcement

- Replaced duplicated Discord text splitters with one **lossless chunking** utility; long narration/private output no longer risks dropping text.
- GM log and state-error channels are now **permission-validated** before configuration/use.
- `/vc-player private-channel` now refuses channels that are visible to ordinary server roles.
- `/vc-gm fact-list` now filters/searches in SQLite **before** applying result limits, so older matching facts remain discoverable.
- Removed direct SQLite access from production modules outside `VeiledDB`.
- Split slash-command declarations from the runtime command dispatcher for easier review/maintenance.
- Added typed domain-error infrastructure and centralized expected-error classification.
- Added fail-fast range/enum validation for general runtime configuration.
- `LOG_LEVEL` is now an active runtime setting.
- Added module responsibility/trust-boundary comments and documented coding standards.
- Added `npm run quality`, `npm run test:refactor`, and combined `npm run validate` release gates.
- Added regressions for long Discord messages, 500+ fact histories, channel privacy, and invalid configuration.
- No database migration or slash-command re-registration required.
