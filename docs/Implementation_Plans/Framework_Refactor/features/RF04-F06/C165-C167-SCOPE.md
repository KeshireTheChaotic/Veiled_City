# C165-C167 scope: Move application workflows

Frozen base revision: `37046e2a8a140bea36a1ecee01f8efc7b9116fee` (C164).

## Delivered changes

Moved seven application workflow implementations into `bot/src/application/workflows/` without changing their exported functions or behavior. Their relative imports were adjusted for the new directory; workflow-to-workflow imports remain sibling imports. A normalized source comparison confirmed each moved file's non-import bytes match its C164 version. Added `workflows/public.js` with one re-export per moved module, then registered that file in `RF01/PACKAGES.json` as an application public entry. Repointed the production imports in `commands.js` and `index.js` to that public registry. Removed exactly the seven root source files; no compatibility shims remain.

The import search covered `bot/src`, `bot/scripts`, and `bot/tooling`. Every actual production caller was repointed or remains a sibling import inside the new workflow directory. No external script or tooling consumer was found. The seven modules have no module-relative file/resource reads, `import.meta.url`, `fileURLToPath`, `__filename`, `process.argv`, or filesystem path access.

## Relocated and modified paths

| Change | Path |
|---|---|
| Moved | `bot/src/assembly-planning.js` → `bot/src/application/workflows/assembly-planning.js` |
| Moved | `bot/src/assembly-publications.js` → `bot/src/application/workflows/assembly-publications.js` |
| Moved | `bot/src/opening-entry.js` → `bot/src/application/workflows/opening-entry.js` |
| Moved | `bot/src/opening-cohort-runner.js` → `bot/src/application/workflows/opening-cohort-runner.js` |
| Moved | `bot/src/session-opening-runner.js` → `bot/src/application/workflows/session-opening-runner.js` |
| Moved | `bot/src/session-opening-recovery.js` → `bot/src/application/workflows/session-opening-recovery.js` |
| Moved | `bot/src/opening-flow.js` → `bot/src/application/workflows/opening-flow.js` |
| Added | `bot/src/application/workflows/public.js` |
| Updated | `bot/src/commands.js`, `bot/src/index.js`, `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json` |
| Archived and removed | Eight exact transition entries in `RF01/TRANSITIONS.json`; full source entries and the pre-removal manifest hash are in `C165-C167-RETIRED.json` |

## Test and manifest boundary

Tests were not run or edited. Existing historical tests that statically import the former root paths remain untouched. The existing `bot/tests/ai-gm-2026-10/compose-startup.mjs` was also left untouched as instructed; it still names the old root `session-opening-runner.js` path, so do not use that old composition for new tests. Fresh feature-local tests must compose the required provider roots and import workflows through `application/workflows/public.js`.

`manifest.json` and `MANIFEST.txt` are generated release inventories; the current manifest predates several of these workflow files. No runtime or tooling consumer reads their source paths to load modules. They were left unchanged, and no version/release metadata was generated.

## Transition records

`C165-C167-RETIRED.json` preserves only the seven physical-location records and the one `index.js` import record made obsolete by these moves. Its `original_manifest_sha256` is the exact pre-removal file hash. Post-removal `TRANSITIONS.json` SHA-256: `3f5b101370f6254dbf1e30cc476134b8b37f66c907d3c7c5df37eb3ce34304a7`. No other records were added, waived, or altered for this batch. The removal occurred after the seven root files and their production consumers were moved.

## Frozen source SHA-256

Hashes cover the working-tree source after relocation and import updates.

| File | SHA-256 |
|---|---|
| `bot/src/application/workflows/assembly-planning.js` | `9ec70f2e8a29e911ae629e2ff7e3409bbe73e6d6b45b09892bf659948f3d8ca2` |
| `bot/src/application/workflows/assembly-publications.js` | `95cb4dadb28a32fb3583f20ee8c54527bb3540ffb2dc42e8a0bd71051447bf9f` |
| `bot/src/application/workflows/opening-entry.js` | `9741b7a2e60a2b376dea1457b5833532231c7d214c46165e38bd8eb33e5769c6` |
| `bot/src/application/workflows/opening-cohort-runner.js` | `a73eea72027b4c96ee27941bcd782e38a0ce60353ef3c97e4651947d0081feed` |
| `bot/src/application/workflows/session-opening-runner.js` | `afea65060382673dcbe16cae889ce851ba44280db8e6e90c54f4e8522cc7bb99` |
| `bot/src/application/workflows/session-opening-recovery.js` | `1c3d73945d7413a686ec76860893e74d2861bdaf318e0cfe43c938648625d152` |
| `bot/src/application/workflows/opening-flow.js` | `f14715eec5a84aedd41c3d8a36ef8604e1c2557e83e016475da260b4ad4bb949` |
| `bot/src/application/workflows/public.js` | `e0843b26217d66772044a4f2dbe0d304ace9e5115dff5cae61196541900813fe` |
| `bot/src/commands.js` | `2004f88499ed1793af813ccfcbddc0d49046cfd690f1bc0d849c90c2580dc05c` |
| `bot/src/index.js` | `f6253ecd98b6d6449800435c0a96b2ad5f82a7417ee355a848ee7c46814ad7d8` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json` | `7d71b745cf0ae9e6f75e40a8704b0ccce717a89c4927ec057458b5e1b82f111a` |

## Rollback and next phase

Rollback only this batch by restoring the seven root source files from the relocated copies, restoring their former relative import specifiers and the former `commands.js`/`index.js` imports, removing `application/workflows/public.js`, and restoring the eight exact archived transition objects from `C165-C167-RETIRED.json`. Leave C164 and unrelated work untouched.

No tests, commit, or release action is claimed. Next exact phase: run the fresh C165-C167 composition-focused test batch, then the authorized RF04 ratchet.
