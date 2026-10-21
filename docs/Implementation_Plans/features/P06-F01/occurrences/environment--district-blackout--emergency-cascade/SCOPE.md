# environment:district-blackout:emergency-cascade

Status: FROZEN FOR TARGETED QUALIFICATION. Parent: [P06-F01](../../SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ENVIRONMENTS/environments.json#district-blackout/features/1`. Source SHA-256: `5852a6554a0575c3ffc5896ee974f9ac986bd9f3d8ca777db6113efb5a39ddb0`; template SHA-256: `24bcd46f4a3a205a6bc8f48768c751d453d8de8beb0e6839ee68081e54cd980c`.

The existing `native-environment-scene.js` route records a source-bound real local service emergency, with no arbitrary numerical service loss or selected PC response. The combined GM prompt already describes this exact handler. This change activates that source-qualified path only.

The targeted batch tests source identity and the exact capability contract; full runtime/release behavior remains outside this delta. No generic fallback or new creative limitation. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Final tested source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; run `fresh-delta-1792599054739` passed 47/47 union tests. The catalog test verifies this occurrence source; this is not occurrence effect qualification. Input/test hashes: parent final evidence.
