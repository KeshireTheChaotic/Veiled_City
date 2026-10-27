# RF05-F04 C21 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C21-SCOPE.md`](C21-SCOPE.md)

## Implementation

Added the data-only `simulationUpdateSchema` under World ownership and exported it through World public. The compatibility module re-exports the identical object; the GM now imports it through World public. `npcDirectorSchema` stays in the mixed compatibility module because it still depends on Intent. No gameplay behavior changed.

## Verification

The frozen 21-file current-GM union ran once: 38 passed, 1 failed, exit 1, 19,012.2857 ms. The only failure was an older C20 test asserting the prompt must be imported alone; C21 validly combined it with the schema in one World-public import. Corrected that test assertion only and reran the affected C20 file once: 1/1 passed, exit 0, 450.5643 ms. Thus all 39 cases passed against current production code across the original union and the focused repair run, not as a single all-green batch. Changed JavaScript syntax passed 21/21. RF05 architecture ratchet remains failed on 950 aggregate prior violations/errors, with zero unowned modules and no C21 changed-path findings. No transition retired; 48 F04 assignments remain. Detailed hashes and actual terminal evidence are in [`C21-RUN.json`](C21-RUN.json).

## Rollback and limits

Restore the earlier GM import and schema declaration, and remove only C21 source/API/test/evidence. No saved state migration is planned. No provider, network, production data, CI, or services. Release remains NOT AUTHORIZED.
