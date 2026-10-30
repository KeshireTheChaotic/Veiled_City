# RF06-F05 R01 — Discord registration boundary

Status: scope frozen before production edits. Agent B owns registration runtime, new feature-local tests and R01 documents. Shared Discord public API and transition/crosswalk writes require a coordinated exclusive window with Agent A; narrative, state, turn orchestration, index.js and db.js are excluded.

Starting branch codex/clean-ai-gm-2026-10; intake HEAD 63432f642b25632b2bf9336c5cf055ac0c8e0bef. User authorizes independently supportable RF06 slices alongside RF05; a blanket RF05-completion hold does not apply to schema-only registration. This slice is RF06-F05 entrypoint composition supporting F04 command separation.

Preserve npm register path, dotenv load, environment keys, missing-credential error, REST v10/token, unchanged command builder and validator, validation before PUT, guild/global route selection, one PUT, success text and failure propagation. No REST client or network call at framework import. Extract registration execution into Discord with injected REST/Routes/logger/environment for fresh offline tests; default to existing implementations. Bootstrap delegates through Discord public. No command handler, storage, rule, audience or receipt behavior changes.

Fresh tests cover guild/global registration payloads, absent credentials, validation rejection, transport rejection without retry/success log, and import dependency isolation. Check changed JS/MJS syntax and architecture ratchet once after exact transition retirement. No live registration, legacy tests, provider calls or databases.

Missing handoff references at intake: AUDIENCE_FIRST_PURPOSE.md, CODEX_START_HERE.md, DECISION_GATES.md and CURRENT_SOURCE_CROSSWALK.md under Implementation_Plans; four current core specifications are under Implementation_Plans rather than repository root. Read present core specs, owner specification, ENGINE constitution, active implementation README/protocols and RF entry/dependency documents. Missing historical references do not block this transport-only extraction.
