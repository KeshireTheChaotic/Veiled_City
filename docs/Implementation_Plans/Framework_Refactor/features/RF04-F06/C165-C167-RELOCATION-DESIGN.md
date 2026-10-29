# C165-C167 physical workflow relocation design

Read-only source map prepared against the current C164 worktree on 2026-10-29. This document does not authorize or perform moves. No source or transition files were changed for this review.

## Bounded relocation set

Move these seven application-owned workflows, preserving their function bodies and exports:

| Slice | Root files to relocate | Exact location records |
|---|---|---|
| C165 | `assembly-planning.js`, `assembly-publications.js` | `a2fb1a12`, `b1602366` |
| C166 | `opening-entry.js`, `opening-cohort-runner.js` | `1e3110ca`, `0193c98b` |
| C167 | `session-opening-runner.js`, `session-opening-recovery.js`, `opening-flow.js` | `934ec472`, `626dd513`, `41b258b6`; also `index.js -> session-opening-runner.js` record `596382ba` |

The target for all seven is `bot/src/application/workflows/`. Preserve each module's existing root exports in a new `bot/src/application/workflows/public.js` registry using seven `export *` lines, one per workflow file. This retains every current named export while giving application entry points one stable import surface. Keep internal workflow-to-workflow imports as direct sibling imports to avoid cycles through the registry.

## Actual source consumers and phase repoints

Reverse-consumer search across `bot/src`, `bot/scripts`, and `bot/tooling` found no module-path references in scripts or tooling. The current source importers are:

| Relocated module | Current `bot/src` importers | Planned adjustment |
|---|---|---|
| `assembly-planning.js` | `assembly-publications.js`, `commands.js`, `session-opening-runner.js` | C165 moves it; publications becomes a sibling import. Commands imports its exports from workflows `public.js`. Session opening runner imports it from workflows `public.js` until C167, then as a sibling. |
| `assembly-publications.js` | `commands.js`, `session-opening-runner.js` | C165 moves it; commands and then the runner import its exports from workflows `public.js`. |
| `opening-entry.js` | `commands.js`, `opening-flow.js` | C166 moves it; commands uses workflows `public.js`; root `opening-flow.js` uses workflows `public.js` until C167, then a sibling import. |
| `opening-cohort-runner.js` | `commands.js`, `opening-flow.js` | C166 moves it; same importer changes as opening-entry. |
| `session-opening-runner.js` | `commands.js`, `index.js`, `opening-flow.js`, `session-opening-recovery.js` | C167 moves it; commands and index use workflows `public.js`; recovery and opening-flow use sibling imports. |
| `session-opening-recovery.js` | `commands.js` | C167 moves it; commands uses workflows `public.js`. |
| `opening-flow.js` | `commands.js` | C167 moves it; commands uses workflows `public.js`. |

`assembly-publications.js` already imports `assembly-planning.js` by sibling path; that path remains valid after C165. `session-opening-recovery.js` imports runner functions and `opening-flow.js` imports runner, entry, and cohort functions. Once moved, those are sibling imports in the same workflow directory. `session-opening-runner.js` also uses assembly-planning and assembly-publications; C165 can point it at the new public registry, then C167 can switch those two to sibling imports without a registry cycle.

## Import rewrites and startup

The moved files have only relative JavaScript imports; the seven files contain no `import.meta.url`, `fileURLToPath`, `__filename`, `process.argv`, filesystem reads/writes, or path-based resource loading. Move-related source edits can stay limited to import specifiers and imports of moved siblings. For imports from the new directory, root-relative framework and kernel paths gain `../../`; internal moved workflow imports stay `./<sibling>.js`.

`commands.js` is the main application importer for all seven. `index.js` imports `runSessionOpening` directly today; C167 must repoint it to the workflows public registry. The package start command remains `node src/index.js`; no CLI path changes are needed. The test composition file `bot/tests/ai-gm-2026-10/compose-startup.mjs` imports `session-opening-runner.js` directly today; C167 should update that startup import to the workflows public registry so composed tests load the moved application surface after the runtime provider roots.

## Root files, saved readers, and generated manifests

The architecture transition records identify the seven root locations as `LEGACY_MODULE_LOCATION`; retaining a forwarding file at the old path would leave the legacy location in place. Source search found no production importer outside the listed `bot/src` consumers, no importer in scripts or tooling, and no dynamic or saved path reader for these JavaScript module names. The direct old-path imports in existing tests are static test references, not persisted runtime readers. Do not retain root compatibility shims solely for those old test paths; do not migrate or run historical tests. New feature-local tests should import the workflows public registry.

Root `manifest.json` and `MANIFEST.txt` contain generated release file inventory entries for some, but not all, current workflow paths. They are generated by `bot/scripts/sync-release.mjs` from Git file enumeration, not used to load these modules at runtime. Regenerate them only through the normal authorized release-metadata step; do not hand-edit them for C165-C167. No package script, CLI, or tooling consumer of the old module paths was found.

## Scope limits and verification notes

Retire only the seven listed `LEGACY_MODULE_LOCATION` records and the one index import record. Do not expand into assembly domain extraction, provider or port redesign, other workflow moves, test migration, or release metadata synchronization. Test composition must retain provider loading before workflow calls; importing `application/workflows/public.js` does not itself initialize provider ports. C165-C167 remain unimplemented and unqualified pending their own source edits, hashes, and fresh changed-code tests.
