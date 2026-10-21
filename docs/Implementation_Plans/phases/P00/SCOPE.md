# P00 — Reconciliation and test reset

**Status:** PLANNED. **Base:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Goal
Inventory actual HEAD, reconcile contradictory docs, establish new tests and change-only selector.

## Independent features
- [P00-F01 — Code / documentation truth](../../features/P00-F01/SCOPE.md)
- [P00-F02 — Fresh change-only validation](../../features/P00-F02/SCOPE.md)

## Exit
All safe features have current diff, truthful ledger and newly authored tests covering only code changed in this phase. Local source gaps and owner decisions remain visible but do not stop other safe work. No automatic release qualification.
