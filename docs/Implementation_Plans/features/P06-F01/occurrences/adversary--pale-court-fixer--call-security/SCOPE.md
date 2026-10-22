# adversary:pale-court-fixer:call-security

Status: SOURCE-BOUND CUE IMPLEMENTATION; TARGETED TEST PENDING. Parent: [P06-F01](../../SCOPE.md); feature: [P06-F62](../../../P06-F62/SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-fixer/features/1`. Source SHA-256: `f7f8a79df4ae31e3838293f15af2d8f40dd221de5b7a1cc4bddca1ec1f9199e2`; template SHA-256: `af98ed2fad3b9caa86fc9353a5409779ce9df91b38597b4f8ce6795837ebc325`.

The exact Action cue is attached only to the currently bound GM-owned Fixer context. It spends no Fear, creates no security actors, validates no range and commits no objective-driven action.

Fresh F62 tests verify source, descriptor, actor provenance and local source drift. Fear payment, security creation/range, actions and replay receipts remain local holds. No generic fallback or added autonomy restriction.

Implementation `20f1e117a1330f4b054d6fd1c971aaa7e82ad066`; mapped fresh run passed 225/225 across 59 files, recorded in [P06-F62](../../../P06-F62/LEDGER.md). Fear spend and security creation/action receipts remain unqualified.
