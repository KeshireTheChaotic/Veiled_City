# RF05-F04 C28 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C28-SCOPE.md`](C28-SCOPE.md)

## Implementation

Moved the three data-only World proposal schemas to a World-owned module and exposed them through World public. The compatibility module preserves identical schema identities and retains all authority and persistence functions. GM imports the schemas publicly and retains the compatibility import for runtime behavior.

## Verification

The frozen 27-file current shared-GM union passed **32/32**, exit **0**, 14,950.2107 ms. The fresh C28 test checks public/compatibility identities, schema fields, and GM's split imports. Syntax passed **5/5**. RF05 ratchet remains at 950 groups/errors, 596 modules, zero unowned, and 2,785 imports; the new schema/public paths have no findings. No transition retired; 47 F04 assignments remain. See [`C28-RUN.json`](C28-RUN.json).

## Rollback and limits

Restore the three schemas to `autonomous-world.js`, restore the GM import, and remove only C28 module/public/test/evidence. No persistent data changes are intended. Release remains NOT AUTHORIZED.
