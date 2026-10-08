# AI-GM correctness roadmap (4.5 onward)

These releases extend existing cognition, city state, canon, clocks and backups.
No Daggerheart/Veiled City mechanics change. Constitution and Rules Desk retain
their separately documented scopes. Required gates: `cd bot; npm run validate`.
The runner denies network access and uses dummy credentials. Passing mocks is
not live-model or Discord coverage. No live campaign data is rewritten.

## Phase A — 4.5.0

Gap: reviews, atomic mutations, dice, receipts, queues, backups and migrations
existed; freeform consequential assertions needed a local contract. GM/director
responses now carry bounded narrative_claims: actor/entity, prior/proposed state,
visibility, source span/reference, certainty and matching event index. Unsupported
damage, movement, secrets, obligations, lifecycle, canon and model dice fail
before commit. Uncertain speech must be framed explicitly; it cannot launder
real secrets. Cosmetic descriptions remain valid. No new verification AI call.
Normal turns reuse their existing bounded correction path.

Failures expose sanitized category/recovery messages plus a GM diagnostic object
with entity/source references, not full prompts or secret text. Inspect source
IDs through existing GM fact/ledger commands. Validation is read-only. It cannot
guarantee semantic detection of every undeclared claim in arbitrary prose;
conservative tripwires supplement the typed contract. Binding changes that need
another mechanical/GM workflow are refused, never invented to fit narration.

`test:contract` uses hand-authored synthetic Responses API fixtures, actual
GMService parsing/schema/retries/router, mock Discord permissions, serialized
queues and seeded privacy cases. Existing suites retain deterministic dice,
commit/publication-failure, restart, backup and migration coverage. All required
suites run behind a network-denial preload. No schema migration is necessary.
Upgrade: back up, stop the old bot, restart. Register commands when they change.

## OPTIONAL — MAY INCUR API COSTS

A human may choose a disposable campaign and explicitly run a real narration,
minor-NPC or TTS check with spending caps. This is never a required CI/release,
acceptance, versioning or deployment gate. This supersedes earlier Living City
documentation calling real-model smoke checks a deployment gate. Required tests
make no live API/Discord requests and do not deploy or push.
