# RF05-F04 C27 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C27-SCOPE.md`](C27-SCOPE.md)

## Implementation

Moved the existing authored-candidate schemas and prompt into an Intent-owned contract module and exposed them through Intent public. The compatibility module re-exports identical values and retains persistence; GM imports the contract publicly. No player-authority or candidate-persistence behavior changed.

## Verification

The frozen 26-file current shared-GM union passed **31/31**, exit **0**, 14,716.6291 ms. The new C27 test verifies public/compatibility identity, current-vs-historical schema composition, prompt text, and GM's public import. Syntax passed **5/5**. The first RF05 ratchet surfaced the exact removed GM-to-compatibility import transition as `UNUSED_TRANSITION`; after preserving and retiring only that exact record, the final ratchet returned to 950 groups/errors, 595 modules, zero unowned and 2,782 imports. The new Intent contract paths have no findings. One transition retired; 47 RF05-F04 assignments remain. See [`C27-RUN.json`](C27-RUN.json) and [`C27-RETIRED.json`](C27-RETIRED.json).

## Rollback and limits

Restore the three declarations to `authored-candidates.js`, restore the old GM import, and remove only C27's Intent module/public export/test/evidence. No persisted data changes are intended. Release remains NOT AUTHORIZED.
