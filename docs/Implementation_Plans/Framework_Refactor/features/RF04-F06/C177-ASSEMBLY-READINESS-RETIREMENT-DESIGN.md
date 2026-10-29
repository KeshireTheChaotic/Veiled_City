# C177 assembly readiness source retirement design

Read-only design review against the current C165-C167 worktree on 2026-10-29. No runtime or manifest files were changed, and no tests were run for this review.

## Proposed bounded change

Move the 30-line GM-only readiness projection from `bot/src/assembly-readiness.js` to `bot/src/frameworks/session/assembly-readiness.js`, preserving its body and export. Replace only its three root imports with the existing Session provider slots from local `./contracts/opening-sources.js`:

- `sessionAssemblyStateSource.assemblyDeliverySummary`
- `sessionAssemblyContextSource.assemblyPlanFreshness`
- `sessionOpeningSource.inspectSessionOpening`

The C164 slots already expose these names and are bound by the original root provider modules. The Session implementation should destructure their forwarding functions at module load, then call them only inside `assemblyReadiness`; do not add provider calls or source reads at module initialization. Re-export `assemblyReadiness` from `frameworks/session/public.js`. Repoint the sole production importer, `bot/src/commands.js`, to that public API and remove the root file. No new port, adapter, policy, state, receipt, or behavior is needed.

## Behavior and evidence boundary

The existing function is a read-only status projection. It reads the saved assembly plan, Session's delivery summary and freshness, and a saved opening job. It catches only `SESSION_OPENING` from `inspectSessionOpening` and converts that exact failure to `source_review_required`; other errors continue to propagate. Its guidance text distinguishes manual, completed, queued/paused, in-progress, review-needed, legacy-pending, and established-party cases. It does not create fictional arrival, mutate saved state, write receipts, or trigger an opening. The move must preserve those branches and strings byte-for-byte; only the import bindings and file location change.

## Public import graph and cycles

`commands.js` is the only production consumer found; it calls `assemblyReadiness` while handling command state. Importing `assemblyReadiness` from Session public API makes the app-to-Session edge public. The new Session source must import `contracts/opening-sources.js` directly rather than importing `frameworks/session/public.js`, preventing a Session public-barrel cycle. `PACKAGES.json` already registers `bot/src/frameworks/session/public.js`; no package public-entry change is needed.

Root provider reachability remains intact after retiring the readiness root. Production `index.js` imports `pvp-output.js`; that module imports root `assembly-state.js`, `assembly-context.js`, and `session-opening.js`, whose module-load bindings populate all three slots. `commands.js` also still imports the context and opening roots for other operations. The new Session module only reads existing provider slots when a command invokes readiness, after application startup has loaded those roots. Public API import alone is not treated as provider initialization.

## Exact transition retirement candidates

The two currently observed records made obsolete by this change are:

| Record | Meaning |
|---|---|
| `57c6e53aebef3e50e6c531a18403543f8d9ff9eb5b4d6872ec10f99b2b4ed362` | Root `assembly-readiness.js` legacy module location |
| `0de71e70d0c729c9aa6ac1df2ffe12e96d0de9323c8b85c07cca0aca83b375e7` | `commands.js` importing the Session-owned root implementation |

No other production importers or saved module-path readers were found. Historical tests may mention the former root path; they are static test references, not reasons to retain a runtime shim. Archive and remove only the two exact records after the source relocation and public import are complete.

## Assessment

No architectural blocker was found. The existing C164 provider surfaces and production bootstrap reachability support the move without adding a root import or hidden fallback. Scope is limited to the one module, Session public export, command import, and the two records above. This remains a design proposal; implementation and qualification are pending the current combined-test freeze.
