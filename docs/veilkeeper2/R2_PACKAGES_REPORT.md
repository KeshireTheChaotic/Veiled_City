# R2 — character package privacy and JSON compatibility

Completed serializer/authorization/preparation slice; full import/export acceptance remains open.

## Delivered files

- `bot/src/v2/character-packages.js`: ports the pinned JSON serializers and recursive player projection from `character-export.js` (fact views through canon export), with local filename helpers. No old framework imports. Preserves the four v3.3.3 schemas, player sheet data, entitled facts/relationships, separate GM hooks, private state, canon provenance, conflicts and proposal status. GM fields and nested GM-visible objects are excluded from player projection.
- `bot/src/v2/gm-hook-package.js`: ports the pinned GM hook normalizer, accepting hook import v3.3.1/v3.3.2/v3.3.3 and hooks export v3.3.3, including structured payloads, sheet hooks and canon suggestions.
- `bot/src/v2/character-package-service.js`: native command boundary authenticates principal/campaign and owner or human-GM role before reading export data. Other-owner/campaign access and player access to GM artifacts are rejected. Character, authentication and repository revision are rechecked before release. Import preparation binds source, campaign and target character independently of package labels. Imports remain awaiting native validation with no execution, publication or canon authority. The service is not an AI capability.
- `bot/tests/veilkeeper2/r2-character-packages.test.mjs`: seven newly authored cases, no legacy test imports or fixtures.

## Evidence

**7/7 tests passed**, zero failures/skips, 62.0555 ms. Coverage includes semantic export fields, nested GM exclusion, no GM repository reads for player export, four separate JSON package preparations, all recognized GM-hook schema versions, owner/GM/campaign checks, changed ownership/revision rejection and untrusted metadata. R2_PACKAGES_TEST_OUTPUT.txt and R2_PACKAGES_TEST_EVIDENCE.json retain actual execution; R2_PACKAGES_HASHES.json records source/test/document hashes.

Pinned legacy serializers, filename helpers and hook normalizer were checked unchanged against `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. The copied serializer block and normalizer preserve their source semantics; tests use fresh synthetic repository data. This is not full production-data equivalence or live Discord proof. Native readers must enforce player fact/relationship entitlement and supply a revision covering all export inputs; the service's injected authentication/revision contract does not prove a production adapter exists.

## Holds and recovery

JSON preparation is not transactional import application. Character creation/mechanical validation, raw character formats, markdown/narrative imports, DOCX/Markdown exports, durable hook/relationship ingestion, import receipts/replay, native canon review and complete migration remain outstanding. Canon suggestions stay in a separate GM package and cannot become accepted world knowledge through this service. Future import handlers must preserve this boundary and independently authorize each effect.

No production data, command routing, legacy source, schema or content changed. No migration, deletion, push or deployment occurred. Rollback is to leave these additive native modules unused. Existing import/export commands remain available; they must not be retired until replacement coverage and migration pass.

**Next exact work:** R2 native recall/import repository adapters and durable private-hook ingestion with separate canon review, then remaining R1/R2 integration and R3 deterministic rules. R0 holds and R3–R8 remain open.
