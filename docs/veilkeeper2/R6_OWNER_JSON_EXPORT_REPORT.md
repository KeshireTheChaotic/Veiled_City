# R6 — native owner JSON character export

Completed slice, 2026-11-13. R6 and all other major phase gates remain incomplete.

## Delivered behavior

The native root handles the explicit JSON branch of `/vc-character export` and `/vc character export`. It selects one currently owned character, refreshes Discord membership before preparation and delivery, and returns an ephemeral `CHARACTER_<name>.json` attachment using the existing v3.3.3 player package fields and trailing newline. Current native HP, Armor, Stress, Hope and death override stale legacy sheet values. Reserve, guest and retired characters remain exportable without becoming executable actors. Incomplete or inconsistent native bootstrap state holds the export.

Player facts and relationships are campaign/owner/character scoped; GM fields are removed recursively. Player-tag matching requires the entire account ID. Character-private relationships require a definite source character; ambiguous recipients hold rather than disclose. These tighten ambiguous legacy filtering and require migration review for affected rows. No inference, gameplay effects, memory grants, canon changes, or legacy database writes occur.

The router shares its existing observed-event set instead of adding a Discord listener. A durable interaction receipt permits one attachment attempt; cold replay cannot resend an upload whose response was lost. Ownership, membership, declaration, ephemeral acknowledgement or input changes suppress delivery. Receipts are transport evidence, never gameplay authority.

## Files and source comparison

- `legacy-readonly-repository.js`: bounded owner facts and relationship readers.
- `canonical-actor-readers.js`: purpose-specific canonical character export; live actor restrictions retained.
- `owner-character-export.js`, `discord-character-exports.js`: preparation, input fingerprint, fresh authorization and one-attempt private delivery.
- `discord-interaction-router.js`, `native-root.js`: opt-in composition; no store/schema or AI capability changes.
- `r6-character-exports.test.mjs`, `helpers/character-export-fixture.mjs`: new native SQLite and simulated Discord coverage.
- `NATIVE_DEPENDENCY_MAP.json`: 123 modules, 85 reachable, 38 uncomposed; four generic tools retained.

The Nov13 remote check still resolves baseline to `15a8f44671f227c6bec69bf30744e03c5692809b`. Source comparison used original `commands.js` lines1222–1233 (default DOCX, explicit JSON), `character-export.js` lines41 and257–259 (player schema and filename), `file-names.js` (safe stem), `player-fact-repository.js` (`playerFactsFor`) and `database.js` line2076 (`listRelationships`). These are cached upstream source references, not claims that legacy runtime paths were executed. Formatters were already ported; this slice composes the owner JSON workflow only.

## Verification

306 distinct checks passed across32 import-dependent files: 11 focused export cases (4465.2314ms), then 295 remaining dependent checks (74697.8528ms, concurrency4). After adding assertions that exports mint neither recall causes nor knowledge, only that changed first case was rerun: passed977.0663ms. Do not sum this rerun as another distinct case. Initial listener warnings prompted sharing the existing observer; final runs have no added listener.

Tests cover safe fields, current native resources, other-PC/private canaries, exact selection, foreign membership, nonprivate acknowledgement, authorization/source races, lost-response cold replay, archived character reads, bounded package/relationship overflow, ambiguous private recipients and unobserved calls. Discord SDK events, membership and upload transport are simulated; these checks do not prove live human authorization or delivery quality. Logs: `.reports/owner-export-dependency-tests-20261113.txt`; affected selection is recorded alongside this report.

The authorized historical test-copy probe prepared6573 bytes with zero facts and three relationships in2.4388ms. No body or owner identity was logged. Its main SQLite hash remained `0fe6f5c91a2df83aa7bfb92eb816630a110dfe435c8c1bc66065eea7361513bf`; zero writes, inference, Discord calls or sends. Probe JSON: `.reports/owner-export-copy-final-20261113.json`. This trusted tester derives the stored owner internally; it does not exercise live authentication or native resource overlay.

## Holds, migration and rollback

Default DOCX, Markdown/all formats, GM-private exports and imports remain unclaimed and unqualified; no legacy handlers or tests were removed. No populated migration, major phase, live Discord, model-quality or production qualification is asserted. The static dependency map proves import closure only.

No schema change or data rewrite is needed. Reverting the source composition restores the previous unhandled native JSON route. Preserve interaction journals during rollback and require explicit review before any uncertain export is reissued; do not erase receipts to retry. Preserve existing native resources and the original legacy copy. No production action or major-phase merge/push occurred.

Next exact R6 slice: implement read-only campaign-scoped GM export facets and compose the existing explicit GM JSON export behind refreshed native human-GM authority; preserve other formats until replacement coverage passes. R3 complete mechanical readiness and R4/R5 conversational/world behavior remain mandatory independent gates.
