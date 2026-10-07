# Veiled City Multiplayer Discord v3.6.0 — Refactor Validation Report

Validation date: 2026-10-07

## Verdict

**Application/refactor validation: PASS.**  
**Dependency reproducibility gate: CONDITIONAL until a real registry-generated `package-lock.json` is retained on the connected deployment host.**

v3.6.0 is the maintainability/privacy refactor requested after the expanded v3.5.5 audit. No campaign schema or slash-command names/options changed.

## Audit findings addressed

### Discord chunking — FIXED

All general Discord message splitting now uses `src/discord/chunking.js`. Splitting is lossless and prefers newline/space boundaries before hard cuts. Regression coverage reconstructs 1,901-, 3,800-, and 5,000-character newline-free inputs exactly.

### GM/private Discord visibility — ENFORCED/VALIDATED

`src/discord/privacy.js` validates GM operational channels and registered player-private channels. `gm_log` and `state_errors` are rejected when readable by `@everyone` or ordinary roles; the configured GM role/admin roles are treated as privileged. Private-channel registration likewise rejects ordinary-role visibility. Publication re-validates configured sensitive channels rather than trusting stored IDs.

`/vc-gm` remains runtime authorization-protected rather than globally hidden. This is deliberate: Discord's default command permission flag cannot express Veilkeeper's configurable custom GM role without requiring that role to also hold Manage Server. Data/channel privacy remains enforced independently.

### GM fact filtering after 500 rows — FIXED

`VeiledDB.listFactsForGM()` now applies visibility/category/player/search predicates in parameterized SQL before the final `LIMIT`, with deterministic `created_at DESC, rowid DESC` ordering. Regression coverage verifies a matching fact older than 510 newer rows remains discoverable.

### DB abstraction leakage — FIXED

Production source outside `db.js` no longer uses `db.db.prepare()`/`db.db.exec()`. Repository methods were added for guest lookup, published messages, session departures, latest ended sessions, visible threads, relationships, canon proposal lookup, public-party threads, and session handouts.

### Configuration validation / LOG_LEVEL — FIXED

General numeric/token-count settings now use the same finite/range/integer validation as voice settings. `ENCOUNTER_AFTERMATH_MODE` and `DEFAULT_RESPONSE_MODE` are enum-validated. `LOG_LEVEL` is now parsed and used by the runtime logger.

### Error classification — REFACTORED

`src/errors.js` provides stable typed application errors and centralized expected-error classification. Legacy message matching is confined to that compatibility boundary while older handlers are migrated incrementally.

### Command/module organization — IMPROVED

Slash-command declarations moved from `commands.js` into `command-definitions.js`, reducing the runtime dispatcher by roughly 370 lines and separating schema review from command execution. Discord chunking/privacy and logging/error concerns are likewise separate modules.

### Commenting / standards — IMPROVED

All production source modules now have responsibility/trust-boundary headers. Security/stateful public interfaces received JSDoc/invariant comments. Historical release-number comments in source were replaced with domain headings. Intentionally swallowed exceptions now document the fallback reason where audited.

Current production-source documentation statistics:

- 27 source modules
- 6,940 source lines
- 40 JSDoc/module documentation blocks (previous audit: 0)
- 32 `//` invariant/fallback comments
- 109 exported symbols

Dense legacy formatting remains and is tracked as a quality warning rather than being mass-reformatted in the same behavioral refactor.

## New quality gates

- `npm run lint` / `npm run quality`
- `npm run format:check`
- `npm run check`
- `npm run test:offline`
- `npm run test:production`
- `npm run test:refactor`
- `npm run validate` (combined application gate)
- `npm run audit:prod` (connected registry security gate)

The dependency-free quality gate verifies module headers and prohibits direct SQLite access outside `VeiledDB`. The format gate verifies final newlines, no trailing whitespace, and space indentation. New source should remain under 240 characters per line; current legacy long lines are reported as warnings for incremental cleanup.

## Validation results

- JavaScript syntax: **PASS** — 36 source/script modules
- Discord command schema: **PASS** — 20 root commands
- Offline campaign smoke suite: **PASS**
- Production regression suite: **PASS**
- Refactor regression suite: **PASS**
- Static quality boundary check: **PASS**
- Whitespace/format check: **PASS**
- Content package validator: **PASS** — 84 domain cards / 53 Markdown / 10 JSON
- Direct SQLite access outside `db.js`: **0 occurrences**
- GM fact >500-row search regression: **PASS**
- Lossless long-message chunking regression: **PASS**
- GM/private channel privacy regression: **PASS**
- Invalid numeric/enum configuration regression: **PASS**

SDK-dependent tests were run against the same isolated Discord/OpenAI test doubles used by the prior audit because this execution environment could not perform a registry install. Test doubles are not included in the release tree.

## Remaining advisories

### Transitive dependency lockfile

The audit environment cannot query npm registry metadata, so it cannot generate a trustworthy transitive `package-lock.json`. An attempted offline shrinkwrap correctly revealed only local audit-test stubs and was discarded rather than shipped. Direct dependency versions and security overrides remain exact.

On the connected production host:

```powershell
npm install
npm run audit:prod
```

Retain the real generated `package-lock.json` with the deployed source. Future Docker/CI deployment can then switch from `npm install` to `npm ci`.

### Manual slash-command retry ambiguity

The prior audit's medium-severity recommendation for generalized idempotency of every explicit mutating slash command remains a tracked hardening item. The authoritative AI/world-director path already has commit/publish separation; a future command-service refactor should give manual mutations the same operation-receipt/idempotency model. This is not newly introduced by v3.6.0.

### Incremental formatting/decomposition

`commands.js`, `db.js`, and `gm.js` remain large legacy modules. v3.6.0 establishes enforceable boundaries and starts decomposition without combining a wholesale rewrite with security fixes. Further domain extraction can now occur incrementally under the new regression gates.
