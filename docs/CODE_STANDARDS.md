# Veiled City Bot Code Standards

## Boundaries

- `db.js` is the SQLite schema/query boundary. Production modules must not call `db.db.prepare()` or `db.db.exec()` directly.
- `state.js` is the authoritative structured-AI mutation boundary. Privacy and transaction rules belong here or in `VeiledDB`, not in prompt prose alone.
- `publishing.js` and `src/discord/*` are non-authoritative Discord output/permission boundaries.
- `gm.js` may propose structured results but must not bypass state/database authorization.
- `command-definitions.js` owns slash-command declarations; `commands.js` owns runtime dispatch.

## Comments and documentation

Each production module begins with a short responsibility/trust-boundary comment. Exported or security-sensitive APIs should document side effects, visibility rules, transaction behavior, or error semantics when those are not obvious from the signature. Comments should explain **why/invariants**, not restate syntax. Release-version history belongs in changelogs rather than source comments.

## Error handling

Use stable domain errors from `errors.js` for new permission, validation, not-found, and state-conflict paths. Legacy message matching remains centralized in `isExpectedError()` only while older handlers are incrementally migrated.

## Formatting

`.editorconfig` is authoritative for whitespace. New source should normally stay under 240 characters per physical line. Existing dense legacy lines are reported as quality warnings so they can be reduced incrementally without a risky whole-project formatting rewrite.

## Required validation

Before release:

```bash
npm run quality
npm run check
npm run test:offline
npm run test:production
npm run test:refactor
npm run audit:prod
```

`npm run quality` fails if a production source module lacks a responsibility header or bypasses the `VeiledDB` SQLite boundary.
