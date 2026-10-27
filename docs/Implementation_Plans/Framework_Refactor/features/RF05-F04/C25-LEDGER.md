# RF05-F04 C25 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C25-SCOPE.md`](C25-SCOPE.md)

## Implementation

Moved the World-only `npcActionSchema` into a World-owned module and exposed it through World public. `simulation-schema.js` re-exports the identical schema and continues composing `npcDirectorSchema` with the existing Intent array. No behavior or native action resolution changed.

## Verification

The new C25 test passed **1/1**, exit **0**, 96.2373 ms; syntax passed **4/4**. RF05 ratchet remains failed at **950** groups/errors, with **594** modules and zero unowned. The new World schema module has no reported finding; legacy `simulation-schema.js` issues remain. No transition retired; 48 F04 assignments remain. See [`C25-RUN.json`](C25-RUN.json).

## Rollback and limits

Restore the `npcActionSchema` declaration in `simulation-schema.js`, remove its World public export/module, and remove only C25 test/evidence. No persistent state changes or behavior changes are intended. Release remains NOT AUTHORIZED.
