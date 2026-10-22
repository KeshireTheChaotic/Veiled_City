# adversary:pale-court-knight:predatory-grace

Status: SOURCE-BOUND CUE IMPLEMENTATION; TARGETED TEST PENDING. Parent: [P06-F01](../../SCOPE.md); feature: [P06-F60](../../../P06-F60/SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-knight/features/0`. Source SHA-256: `316bee8e6ca7f3d943c1a3382ada3b9af1cf323fc3000db609db52a073f854cb`; template SHA-256: `9a8b967e26660e29f8070f8490d7a9515f63b294b875b181ff716a8b95fda305`.

The exact source-bound Passive cue is projected only in current GM-owned Knight context. No forced-movement event or once-per-scene prevention receipt is committed.

Fresh F60 tests cover source, descriptor, actor provenance and local source drift. Forced-movement event matching, per-scene immunity and replay remain local holds. No generic fallback or new creative limitation. Preserve saved readers and receipts.

Implementation commit `20a6a13e83cc3b6a17187aaf195c5b16a71c421c`; repaired mapped run passed 217/217 across 57 fresh files, recorded in [P06-F60](../../../P06-F60/LEDGER.md). The source-bound cue is supported; per-scene forced-movement prevention remains unqualified.
