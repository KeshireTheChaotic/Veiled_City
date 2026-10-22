# adversary:morrowline-echo:bad-future

Status: SOURCE-BOUND CUE IMPLEMENTED; TARGETED TEST PENDING. Parent: [P06-F01](../../SCOPE.md); feature: [P06-F57](../../../P06-F57/SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#morrowline-echo/features/2`. Source SHA-256: `f7442d36f1d96101f28f0ea39f9fe2718fd2e3669f1dbe6d3e93741c72d8ddc9`; template SHA-256: `0488f9de16410d11fb9a095e4951045a323d3eea51ad8a8e425ae4e96d47e8fa`.

Owner authorized the exact authored behavior: when the Echo is reduced to 3 HP or fewer, truthfully state one danger, one opportunity, and one uncertainty in the current scene. The GM retains creative latitude inside those content requirements. The native descriptor exposes an exact source-bound cue in current GM-owned actor context; it does not infer HP, dice, costs, PC choices or effects.

The fresh feature test checks exact source, descriptor, provenance attachment and local source drift. Separate native HP-trigger/effect/replay execution remains a local hold. No generic fallback. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Implementation commit `1b2ffc1a54c40ef283eae4fd7cec735400be74db`; current 209/209 fresh mapped tests and hashes are recorded in [P06-F57](../../../P06-F57/LEDGER.md). The source-bound cue is supported; native HP-trigger/effect/replay execution remains separately unqualified.
