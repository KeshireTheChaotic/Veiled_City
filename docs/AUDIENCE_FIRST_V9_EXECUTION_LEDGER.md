# Audience-first V9 execution ledger

## Scope and foundation

- Parent local SHA: `09ee30f42ed275a1effc6891e052d6b2eaaac803`; branch `codex/audience-first-narrative-v9`.
- Parent completed qualification is historical evidence only (123 mandatory suites, 39 optional matrices retained); not a claim that this rewrite is qualified.
- Owner requests revision `0.0.0.1`, and a fresh production DB. No production operation authorized. Native mechanics/privacy/agency/once-only security assertions remain mandatory.
- Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## F0 — dormant framework (qualified)

Four standalone adapters and original nine structural tests imported from the starter without runtime callers. Version tooling accepts the private `0.0.0.N` series alongside the unchanged legacy SemVer policy; package and lock metadata agree. No dependency changes. Superseded semantic replacement plan removed after a filename consumer scan; six referenced candidates kept. See purge ledger.

Executed `node --test scripts/audience-first-framework-test.mjs`: exit 0, 9/9 passing, 0 skipped. `npm run check`: exit 0. Neither invoked providers or SQLite fixtures. Source search confirms no production import of the scaffold. Starter ZIP SHA256: `d2762466263cb1fa566804be813aeddedbb024f66f2d765e10400895377797c44`. Normalized release sync and diff check are required before this atomic commit. No full validator at F0. No real provider/Discord calls, production access, push, merge or deployment. Rollback: return to parent source on this local branch; do not restore any database.

F0 commit: `7e2edd4d86791b50b9c1384ad93cb8de693824d3`.

## F1 — native audience wiring (qualified local adapter)

Starting SHA: `7e2edd4d86791b50b9c1384ad93cb8de693824d3`. `audience-native-v9.js` registers native context snapshots in a WeakMap, issues opaque audience capabilities from existing authenticated source/owner/session/principal/placement/zone/disclosure proof, and reconstructs proof from DB at establishment and every deferred render. A placed party owner gets `player`, unplaced party camera gets `channel`, and private owner gets only `player_private`. Model JSON cannot mint a grant or relabel private context. The writer now receives native audience constraints before generation; proof persists with new drafts/units. No provider calls added.

Red: new adapter module missing (focused runner exit 1; not a claimed production security failure). Green: `node --import ./scripts/offline-guard.mjs --test --test-name-pattern=F1 scripts/audience-first-integration-test.mjs`, exit 0, **5/5**, no skips. Existing native locality/private/revocation/hearing/payload guards: same guarded runner with `--test-name-pattern='NC01|NC02|NC03|NC04|NC05|NC06|NC07|NC28' scripts/narrative-correctness-retirement-test.mjs`, exit 0, **8/8**. Logs in OS temporary directory. Full validator deliberately deferred.

Native GM-internal framework is backend-only, not an external writer permission. No general remote communication capability exists here: remote NPCs remain held rather than minting an unproved cutaway. Registered staged contexts retain native post-move proof and are rechecked after commit. Current v8 text validators remain in place until F3; a v9 label is not a waiver. Source revocation, owner change and scope mismatch fail closed. Rollback: source revert, no DB restore; additive JSON sidecars only.

F1 commit: `6b92a4ec2b7472901dbb215e3d054a47bd2d262e`.

## F2 — mechanical input/output (qualified adapters)

Starting SHA: `6b92a4ec2b7472901dbb215e3d054a47bd2d262e`. New `mechanical-native-v9.js` bridges opaque audience grants to `consentAction`, current accepted typed source, owner/principal/scene, exact pending selection and existing native v4 outcome projection. Roll questions use `request_roll`, always nonexecuting and `needs_adjudication`. Unspecified submissions remain `needs_selection`, even with one unrelated request. Same accepted occurrence or exact owner-authored request token is required. No narrative module executes dice, costs or adjudication. Older saved native result ancestry may answer a current query; source IDs need not be identical. Native output still enforces actual saved results and explicit public disclosure.

The authoritative `resolveTypedNativeRolls` executor now shares this read-only selector; no competing execution service. Existing request/consent/option/damage behavior remains native. Typed interpretation instructions distinguish questions from submissions without an additional model request.

Red: missing adapter API (exit 1). New F2 cases then **4/4**. First native integration run exposed a refactor regression (30/31): enforcing model target equality incorrectly blocked the same accepted occurrence. Restored independent native occurrence binding, retaining exact cross-request selection proof. G12 rerun **11/11**. Final guarded run of `v9-roll-truth-test.mjs`, `v9-pvp-typed-roll-test.mjs`, `audience-first-integration-test.mjs`: **40/40**, exit 0, 0 skipped. Real saved Critical, missing Difficulty review, ordinary attack/damage, replay, tag/owner/private/forgery checks run through native services. Zero network/API/billable calls.

No schema migration; additive adapter only. Public results require the existing native owner disclosure, never a writer label. Rollback is a source revert; committed outcomes are untouched. Full validation remains deferred to F7.

F2 commit: `9e2f534556b7c9822cafa5e3d2dd6167b4bfe705`.

## F3 — scoped v9 writer and native compiler (qualified adapter cutover)

Starting SHA: `9e2f534556b7c9822cafa5e3d2dd6167b4bfe705`. The existing isolated writer now requests `narrativeResponseV9Schema`: version 9, independently task-bound acts and bounded ordinary identity proposals. No model visibility/owner/recipient/grant/effect fields. Grant task IDs are native request/task identities, sent before generation. `compileWriterV9` maps role/speaker/location/source proposals to existing native per-unit locality, proxy, actor-known/listener-entitled, material, secret, canon/identity and artifact validators. Compiler failures are part-local; unexpected programming errors propagate, never masquerade as safety success. Accepted rows bind the original act, translated unit and audience proof; deferred reads verify all three and immutable hashes.

The same existing writer call handles all acts; zero extra round trips or judge. V8 fixture/flag-off readers remain temporarily reachable pending F6, but current strict provider producer is v9. Native v4 output remains separate. Existing grounded NPC cognition/import/hearing services are reused, not model-issued evidence. An assembly/input reference still cannot grant NPC knowledge. Unknown/remote/proxy speakers stay held.

Red-first actual v9 output/outbox cases: **0/4 pass, 4 fail**, exit 1. After implementation **4/4**, exit 0: substantive empty-facts scene; safe sibling vs exact Choso apology/remote speaker; private restart/revocation; attributed local offer vs forged actor evidence. Combined guarded `audience-first-framework-test.mjs`, `audience-first-integration-test.mjs`, `semantic-language-robustness-test.mjs`: **46/46**, 0 skipped, exit 0. No real provider/Discord/network/API calls. Exact SEM/agency/arrival/replay assertions unchanged.

Residual limitation: independently enforced source/audience/actor/receipt gates are deterministic; the meaning of newly generated ordinary prose is not universally semantically provable. Existing conservative material tripwires remain; v9 role labels alone never waive them. Further expressive false holds are F5, not claimed fixed here. No DB schema migration or historical rewrite. Rollback by source revert, preserving native outcomes.

Next: F4 commit-state separation and native per-task completion. No live runtime, production DB, flags, push or deployment touched.
