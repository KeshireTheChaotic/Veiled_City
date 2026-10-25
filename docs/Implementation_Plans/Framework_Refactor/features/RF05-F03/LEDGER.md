# RF05-F03 execution ledger

**Status:** PARTIAL — prompt-budget/disclosure slice qualified; remaining preassigned RF05-F03 source transitions remain locally held.
**Base HEAD:** `8e778dbabb7dc80de85d828aab4f96dcf11b0c7a`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Source evidence

- `prompt-budget.js` contains five request-local projections plus `budgetTurnPrompt`; its only production consumer was `gm.js`.
- Four functions are pure projections; `referenceTurnStorage` calls Knowledge's `factVisibleTo` only to decide whether an exactly matching native fact's content/provenance may be represented by a reference to the required same-request GM-private facts section.
- The original Knowledge dependency is replaced with an injected predicate at the provider API and a two-framework adapter that always supplies the actual Knowledge public predicate and cannot be overridden by its caller.
- Frozen records identify the old module path, the `gm.js` private-path import, and the direct Knowledge import. Only those exact entries may be retired after the source path/edges disappear. The separate pair registry and public-entrypoint configuration are updated to match the implementation.

## Process note

The initial file move and small adapter/API edits began before this feature's scope and ledger were created. No tests were run and no commit was made before these records were written. This sequence was contrary to the phase protocol; it is recorded here so the remaining implementation, single frozen test batch, gate result, and commit are governed by this scope. Preserve the initial changes and do not reset them. Subsequent manifest reconciliation found a separate exact pilot move also assigned RF05-F03; this classifier was added to the scope and is now included.

## Implementation and qualification

Moved all five prompt-budget functions to `frameworks/ai-provider/prompt-budget.js`. The provider module no longer imports Knowledge; `referenceTurnStorage` receives the visibility predicate as an input. Added `framework-to-framework/ai-provider--knowledge`, whose public adapter imports only the Knowledge and AI-provider public APIs and always injects the authoritative `factVisibleTo` function. `gm.js` calls provider public budget/projection APIs and the pair API for disclosure-qualified storage references. Registered both public paths in package configuration and marked the observed pair adopted only for this one call path.

Fresh test `bot/tests/ai-gm-2026-10/rf05-f03-c01.test.mjs` passed **6/6**, exit **0**, TAP duration **90.3717 ms**. It exercises recipient-qualified exact fact references, source mismatch/archive/inactive/campaign/provenance rejection, context/session and roster projections, whole-record optional omissions with mandatory context retained, and mandatory-overflow diagnostics. Changed-file syntax passed **6/6**, exit **0**. The test was renamed only to satisfy the architecture checker's canonical test-path pattern; test contents and recorded SHA-256 are unchanged.

RF05 ratchet originally exited **1**: 570 modules, zero unowned, 2729 imports, largest cycle 181, 2437 raw historical occurrences, 1464 accepted, 968 active groups, and 967 transition errors. The unexplained 968th group was `INVALID_BRIDGE_TEST_REFERENCE`: the registry named a real fresh test whose filename was outside the checker's supported pattern. This path-only defect is corrected by renaming the test to `rf05-f03-c01.test.mjs`; the unchanged test is not rerun. The remaining 967 transition errors are separate earlier-phase debt. No provider calls, tokens, or spend. Historical results and hashes remain in `RF05-F03-RUN.json` and the phase logs.

The exact source-observation pilot assigned to RF05-F03 is moved into Narrative and exposed at its public API; `gm.js` uses that public API. Its production behavior is tested separately in `rf05-f03-scene-observation.test.mjs`. Transition reconciliation found **289 RF05-F03 records remain** (36 legacy locations, 127 direct cross-framework edges, 124 cycle edges, 2 pair-boundary edges). They span mixed Narrative, native-environment, and mechanics modules and are not safe to remove wholesale. Their exact IDs/edges are retained in `LOCAL_HOLDS.json`; these holds keep F03 and the RF05 phase incomplete. No new exceptions or deadline changes are made.

## C02 — Narrative-owned Director guidance

The existing soft Director guidance string was moved unchanged into Narrative and exported through its public API. The GM consumer uses the public import; the old root path remains a one-line compatibility re-export because three existing feature tests import it. The fresh changed-code test passed 1/1 (exit 0; 550.797 ms), and changed-file syntax passed 5/5. The root-location transition remains active; no RF05-F03 transition was retired. **289** assigned RF05-F03 entries remain, including this compatibility path. See `C02-SCOPE.md` and `C02-RUN.json`; release remains NOT AUTHORIZED.

## Holds and rollback

RF04 and the phase-wide RF05 ratchet remain incomplete from earlier transition debt. Preserve Daggerheart source/receipt authority, existing disclosure predicate semantics, and the request-local non-persistent nature of these projections. Rollback only the RF05-F03 commit and restore its exact prior import paths/manifest entries if needed.

## Next step

Next independent feature: RF05-F04, decompose provider/narrative/intent call paths into narrow application workflows without moving combined GM policy wholesale or introducing creative restrictions. F03 remains locally incomplete until its recorded transition debt is resolved or separately authorized.
