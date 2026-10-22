# adversary:pale-court-fixer:reputation-attack

Status: SOURCE-BOUND CUE IMPLEMENTATION; TARGETED TEST PENDING. Parent: [P06-F01](../../SCOPE.md); feature: [P06-F61](../../../P06-F61/SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-fixer/features/0`. Source SHA-256: `71a92b466bb5be9e0f1aea589e22222a86689989c26257f8b48a8bea6ec7e5af`; template SHA-256: `af98ed2fad3b9caa86fc9353a5409779ce9df91b38597b4f8ce6795837ebc325`.

The exact Action cue is attached only to the currently bound GM-owned Fixer context. It does not choose an institution, spend Stress, create a misunderstanding, apply disadvantage or decide how it is resolved.

Fresh F61 tests verify source, descriptor, actor provenance and local source drift. Target validation, Stress spending, institution proof, disadvantage lifecycle and replay remain held. No generic fallback or new narrative/autonomy restriction.

Implementation commit `b272b6129dcdc72f31ab6e73a92bc3c5e9a4f58c`; mapped fresh run passed 221/221 across 58 files, recorded in [P06-F61](../../../P06-F61/LEDGER.md). The source cue is supported; native institution/disadvantage lifecycle remains unqualified.
