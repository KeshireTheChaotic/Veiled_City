# RF05-F03 execution ledger

**Status:** COMPLETE FOR SCOPED PROMPT-BUDGET AND DISCLOSURE BOUNDARY. RF05 phase gate remains failed on inherited RF04 debt.
**Base HEAD:** `8e778dbabb7dc80de85d828aab4f96dcf11b0c7a`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Source evidence

- `prompt-budget.js` contains five request-local projections plus `budgetTurnPrompt`; its only production consumer was `gm.js`.
- Four functions are pure projections; `referenceTurnStorage` calls Knowledge's `factVisibleTo` only to decide whether an exactly matching native fact's content/provenance may be represented by a reference to the required same-request GM-private facts section.
- The original Knowledge dependency is replaced with an injected predicate at the provider API and a two-framework adapter that always supplies the actual Knowledge public predicate and cannot be overridden by its caller.
- Frozen records identify the old module path, the `gm.js` private-path import, and the direct Knowledge import. Only those exact entries may be retired after the source path/edges disappear. The separate pair registry and public-entrypoint configuration are updated to match the implementation.

## Process note

The initial file move and small adapter/API edits began before this feature's scope and ledger were created. No tests were run and no commit was made before these records were written. This sequence was contrary to the phase protocol; it is recorded here so the remaining implementation, single frozen test batch, gate result, and commit are governed by this scope. Preserve the initial changes and do not reset them.

## Implementation and qualification

Moved all five prompt-budget functions to `frameworks/ai-provider/prompt-budget.js`. The provider module no longer imports Knowledge; `referenceTurnStorage` receives the visibility predicate as an input. Added `framework-to-framework/ai-provider--knowledge`, whose public adapter imports only the Knowledge and AI-provider public APIs and always injects the authoritative `factVisibleTo` function. `gm.js` calls provider public budget/projection APIs and the pair API for disclosure-qualified storage references. Registered both public paths in package configuration and marked the observed pair adopted only for this one call path.

Fresh test `bot/tests/ai-gm-2026-10/rf05-f03-prompt-budget.test.mjs` passed **6/6**, exit **0**, TAP duration **90.3717 ms**. It exercises recipient-qualified exact fact references, source mismatch/archive/inactive/campaign/provenance rejection, context/session and roster projections, whole-record optional omissions with mandatory context retained, and mandatory-overflow diagnostics. Changed-file syntax passed **6/6**, exit **0**.

RF05 ratchet exited **1**: 570 modules, zero unowned, 2729 imports, largest cycle 181, 2437 raw historical occurrences, 1464 accepted, 968 active groups, and 967 transition errors. There are **zero active violations or transition errors on F03's changed paths**. The phase gate remains unqualified because earlier RF04 transition debt is expired under RF05. No provider calls, tokens, or spend. Exact results and hashes are in `RF05-F03-RUN.json` and `phases/RF05/rf05-f03-*.log`.

## Holds and rollback

RF04 and the phase-wide RF05 ratchet remain incomplete from earlier transition debt. Preserve Daggerheart source/receipt authority, existing disclosure predicate semantics, and the request-local non-persistent nature of these projections. Rollback only the RF05-F03 commit and restore its exact prior import paths/manifest entries if needed.

## Next step

Next exact feature: RF05-F04, decompose provider/narrative/intent call paths into narrow application workflows without moving combined GM policy wholesale or introducing creative restrictions.
