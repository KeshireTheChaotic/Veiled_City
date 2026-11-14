# R7 — verified offline native snapshots and restoration

Completed slice, 2026-11-14. All R0–R8 major phases remain incomplete.

## Delivered

`runtime-snapshots.js` creates a sealed offline archive under both the shared local guild lease and the selected runtime's exclusive manifest lock. It preserves native main/WAL/journal files and the original legacy source copy; hashes are checked before/after capture. File hashing uses a1MB buffer. SQLite SHM coordination files are rebuilt, not treated as durable game state. Unknown files, incomplete initialization, source drift or incompatible manifests hold. No native rows or source data are rewritten.

Restoration verifies the caller's explicit snapshot hash, every archived file and the closed file set, then creates a new bundle with separate native/legacy directories. Only source path and file inode metadata rebind after exact source-content and schema checks. Campaign/run identity, resources, memories and receipts stay intact. It cannot overwrite the original runtime or an occupied destination. A pending restoration marker is part of initial manifest creation, so an interrupted restore cannot resume as an empty healthy runtime. Completed restored state requires the exact `VK2_RESTORED_SNAPSHOT_HASH` before native startup/login; a missing or wrong value holds.

The operator CLI `bot/tooling/veilkeeper2/runtime-snapshot.mjs` supports create, inspect and restore. It never logs in, runs inference or publishes data. Snapshot files contain private campaign data and remain local, outside Git. This is an operator API, not an AI capability or a generic state patch.

## Files and actual verification

Changed: `runtime-directory.js`, `native-start.js`, new `runtime-snapshots.js`, new operator CLI, new `r7-runtime-snapshots.test.mjs`, static closure tool/graph and accompanying evidence. The closure now includes the offline operator entry and counts it separately from actual legacy imports.

36 distinct checks across five affected files pass: five populated snapshot cases (1933.2513ms) plus31 startup/resume/provider/lease checks (2909.3888ms, concurrency4). After expanding the wrong-startup-hash assertion, only that changed restoration case reran (1050.1232ms), passing. Initial fixture setup had inference disabled, so its optional knowledge store was absent; enabling a throwing simulated provider allowed private-memory preservation to be exercised without any inference calls. No completed unchanged tests were rerun.

Coverage includes exact source/native bytes; local live-guild exclusion; restored pending actions, Hope and private memory; preserved historical legacy rolls; original runtime still usable; no invented healthy life state; wrong hashes/corruption/nonempty/overlapping destinations; incomplete restoration; and explicit startup review before a simulated login. These are real SQLite/filesystem tests with simulated Discord clients, not human/live acceptance.

Actual CLI probe on the authorized historical test copy: `.reports/runtime-snapshot-probe-20261114-f5894402-e5d8-4137-af17-148f59e1c1e5`. Snapshot SHA40a4cab883017fc77fe54011d2936f33c8807b317b15d6e0b80ba23a6a8088a9;11 archived files, nine native data files verified byte-for-byte, run identity preserved. Legacy main SHA remains0fe6f5c91a2df83aa7bfb92eb816630a110dfe435c8c1bc66065eea7361513bf. Preserved aggregate counts: one character, zero facts, two rolls, ten relationships, nine GM hooks and two proposals. No bodies/player identities logged, original data overwrites, client startup, Discord/inference/cloud calls or sends. This historical native store does not prove populated real native gameplay; the populated native assertions use controlled fixtures.

Initial actual probe incorrectly named the parent directory; the source/native-separation preflight rejected it. Preserve failed artifact root `.reports/runtime-snapshot-probe-20261114-b0fdbc57-bfeb-462f-be89-0c899c71c4c3`; corrected invocation names its native child. Sanitized process inspection found no matching project/native Node launcher. This is not a global bot-ownership claim; SQLite locking is the selected-directory exclusion proof.

Fresh Nov14 remote heads remain baseline15a8f44671f227c6bec69bf30744e03c5692809b and origin rebuildfda77bd84b216e0e883c8b1348b12e7611787388. Static graph:130 native modules,91 reachable,39 uncomposed,eight legacy imports,zero missing imports and four generic AI capabilities. No new game-state schema, legacy retirement, major-phase merge/push or production action occurred.

## Operation and rollback

Run from the rebuild root; paths are operator supplied:

```text
node bot/tooling/veilkeeper2/runtime-snapshot.mjs create --directory <native-dir> --legacy <legacy-copy.sqlite> --guild <guild-id> --destination <new-archive-dir> --leases <shared-local-lease-dir>
node bot/tooling/veilkeeper2/runtime-snapshot.mjs inspect --snapshot <archive-dir> --hash <snapshot-sha256>
node bot/tooling/veilkeeper2/runtime-snapshot.mjs restore --snapshot <archive-dir> --hash <snapshot-sha256> --destination <new-bundle-dir> --leases <same-shared-lease-dir>
```

Do not run competing writers or change coordination paths during capture/restoration. Legacy launchers and other machines are not fenced. Keep originals and failed partial bundles; never delete stores/journals to make preflight pass. Restoration is offline: using a historical snapshot for play requires separate reconciliation of later external publications and uncertainty/high-water marks, then explicit owner cutover authorization. The startup hash guard is not that release authorization. Never use an older launcher to bypass it; older code does not understand the pending-restore safety marker. No actual restored bundle was logged in by this work.

Next R7: populated legacy/pre-manifest conversion, semantic source/owner/recipient comparisons, external publication reconciliation, fuller crash/fault and large-history performance qualification. This slice restores already manifested native state; it does not migrate uncomposed roll stores or arbitrary historical directories. Continue R3 mechanical readiness and R4/R5 human-like conversational/autonomous world behavior independently.
